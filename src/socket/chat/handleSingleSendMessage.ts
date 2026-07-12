import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import users from "../../module/user/user.model";
import conversations from "../../module/conversation/conversation.model";
import messages from "../../module/message/message.model";

interface SendMessagePayload {
  receiverId: string;
  serviceId?: string;
  text: string;
}

export const handleSingleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: SendMessagePayload
) => {
  const session = await mongoose.startSession();

  try {
    if (!data.receiverId) {
      throw new Error("Receiver ID is required.");
    }

    if (!data.text?.trim()) {
      throw new Error("Message cannot be empty.");
    }

    if (currentUserId === data.receiverId) {
      throw new Error("You cannot send a message to yourself.");
    }

    session.startTransaction();

    const receiver = await users.findById(data.receiverId).session(session);

    if (!receiver) {
      throw new Error("Receiver not found.");
    }

    // Find existing conversation between these two users (ignore serviceId)
    const conversationFilter: any = {
      participants: {
        $all: [currentUserId, data.receiverId],
        $size: 2,
      },
    };

    let conversation = await conversations
      .findOne(conversationFilter)
      .session(session);

    let isNewConversation = false;

    if (!conversation) {
      const createdConversation = await conversations.create(
        [
          {
            serviceId: data.serviceId ?? undefined,
            participants: [currentUserId, data.receiverId],
          },
        ],
        {
          session,
        }
      );

      conversation = createdConversation[0];
      isNewConversation = true;
    }

    const createdMessage = await messages.create(
      [
        {
          text: data.text.trim(),
          msgByUserId: currentUserId,
          conversationId: conversation._id,
        },
      ],
      {
        session,
      }
    );

    const savedMessage = createdMessage[0];

    await conversations.findByIdAndUpdate(
      conversation._id,
      {
        $set: {
          lastMessage: savedMessage._id,
        },
      },
      {
        session,
      }
    );

    await session.commitTransaction();

    // Build a clean message payload with all IDs as strings
    // so socket.io serialization doesn't mangle ObjectIds
    const msgObj = savedMessage.toObject() as any;
    const messagePayload = {
      _id: savedMessage._id.toString(),
      text: savedMessage.text,
      msgByUserId: currentUserId,
      conversationId: conversation._id.toString(),
      seen: savedMessage.seen ?? false,
      createdAt: msgObj.createdAt,
      updatedAt: msgObj.updatedAt,
    };

    const roomId = conversation._id.toString();

    // Ensure sender socket is in the room
    await socket.join(roomId);
    socket.data.currentConversationId = roomId;

    // Emit new-message ONLY to the conversation room
    // (sender is in the room so they get their own echo)
    io.to(roomId).emit("new-message", messagePayload);

    // For the receiver — emit a lightweight event to their personal room
    // so their conversation list refreshes (but NOT new-message to avoid duplicates)
    io.to(data.receiverId).emit("conversation-updated", {
      conversationId: roomId,
    });

    // Seen logic — check if receiver is currently viewing this conversation
    const room = io.sockets.adapter.rooms.get(roomId);

    if (room) {
      let receiverViewingConversation = false;

      for (const socketId of room) {
        const connectedSocket = io.sockets.sockets.get(socketId);

        if (
          connectedSocket &&
          connectedSocket.id !== socket.id &&
          connectedSocket.data.currentConversationId === roomId
        ) {
          receiverViewingConversation = true;
          break;
        }
      }

      if (receiverViewingConversation) {
        await messages.findByIdAndUpdate(savedMessage._id, {
          $set: {
            seen: true,
          },
        });

        io.to(roomId).emit("messages-seen", {
          conversationId: roomId,
          seenBy: data.receiverId,
          messageIds: [savedMessage._id.toString()],
        });
      }
    }

    if (isNewConversation) {
      io.to(data.receiverId).emit("conversation-created", {
        conversationId: roomId,
        lastMessage: messagePayload,
      });

      socket.emit("conversation-created", {
        conversationId: roomId,
        lastMessage: messagePayload,
      });
    }
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Send Message Error:", error);

    socket.emit("socket-error", {
      event: "new-message",
      message: error.message || "Something went wrong.",
    });
  } finally {
    await session.endSession();
  }
};