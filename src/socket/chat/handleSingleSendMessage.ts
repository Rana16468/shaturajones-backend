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

    const conversationFilter: any = {
      participants: {
        $all: [currentUserId, data.receiverId],
        $size: 2,
      },
    };

    if (data.serviceId) {
      conversationFilter.serviceId = data.serviceId;
    }

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

    const roomId = conversation._id.toString();

    socket.join(roomId);
    socket.data.currentConversationId = roomId;

    // Emit message
    io.to(roomId).emit("new-message", savedMessage);

    // Seen logic
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
          conversationId: conversation._id,
          seenBy: data.receiverId,
          messageIds: [savedMessage._id],
        });
      }
    }
    if (isNewConversation) {
      io.to(data.receiverId).emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: savedMessage,
      });

      socket.emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: savedMessage,
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