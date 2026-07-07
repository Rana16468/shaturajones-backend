import { Server, Socket } from "socket.io";
import conversations from "../../module/conversation/conversation.model";
import messages from "../../module/message/message.model";


interface SeenPayload {
  conversationId: string;
}

export const handleSeenMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: SeenPayload
) => {
  try {
    console.log({
      data,
      currentUserId,
    });

    if (!data?.conversationId) {
      return socket.emit("socket-error", {
        message: "Conversation Id is required",
      });
    }

    const conversation = await conversations
      .findById(data.conversationId)
      .select("_id participants");

    if (!conversation) {
      return socket.emit("socket-error", {
        message: "Conversation not found",
      });
    }

    const otherUserId = conversation.participants.find(
      (id: any) => id.toString() !== currentUserId
    );

    if (!otherUserId) {
      return;
    }

    const unseenMessages = await messages.find({
      conversationId: data.conversationId,
      msgByUserId: otherUserId,
      seen: false,
    });

    if (!unseenMessages.length) {
      return;
    }

    await messages.updateMany(
      {
        _id: {
          $in: unseenMessages.map((m) => m._id),
        },
      },
      {
        $set: {
          seen: true,
        },
      }
    );

    io.to(data.conversationId).emit("messages-seen", {
      conversationId: data.conversationId,
      seenBy: currentUserId,
      messageIds: unseenMessages.map((m) => m._id),
    });
  } catch (error) {
    console.error(error);

    socket.emit("socket-error", {
      message: "Failed to mark messages as seen.",
    });
  }
};