import { Server as IOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import QueryBuilder from '../app/builder/QueryBuilder';
import messages from '../module/message/message.model';
import conversations from '../module/conversation/conversation.model';
import { handleMessagePage } from './chat/handleMessagePage';
import { handleSingleSendMessage } from './chat/handleSingleSendMessage';
import { handleSeenMessage } from './chat/handleSeenMessage';



const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  currentUserId: string,
): Promise<void> => {
  
  socket.on("specific_conversation", async (data) => {
    try {
      const { conversationId, page = 1, limit = 20 } = data;

      if (!conversationId) {
        return socket.emit("specific_conversation_error", {
          message: "conversationId is required",
        });
      }

      const baseQuery = messages
        .find({ conversationId })
        .populate([
          {
            path: "msgByUserId",
            select: "name photo",
          },
        ])
        .sort({ createdAt: -1 }); 

      const messageQuery = new QueryBuilder(baseQuery, { page, limit })
        .filter()
        .paginate()
        .fields();

      const allMessage = await messageQuery.modelQuery;
      const meta = await messageQuery.countTotal();

      socket.emit("specific_conversation_success", {
        meta,
        allMessage
      });

    } catch (error: any) {
      console.error("Socket error (specific_conversation):", error);
      socket.emit("specific_conversation_error", {
        message: "Error finding conversation messages",
        error: error?.message,
      });
    }
  });


  socket.on("join-conversation", async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit("join-conversation-error", { message: "conversationId is required" });
      }

      // Safe validation using ObjectId checking
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return socket.emit("join-conversation-error", { message: "Invalid conversationId format" });
      }

      const isExistConversation = await conversations.exists({
        _id: new mongoose.Types.ObjectId(conversationId),
        participants: { $in: [currentUserId] },
      });

      if (!isExistConversation) {
        return socket.emit("join-conversation-error", {
          message: "Conversation not found or access denied",
        });
      }

      await socket.join(conversationId);
      socket.data.currentConversationId = conversationId; 

      socket.emit("join-conversation-success", {
        conversationId,
        message: "Joined successfully",
      });

    } catch (error: any) {
      console.error("Join conversation error:", error);
      socket.emit("join-conversation-error", {
        message: "Internal server error",
        error: error?.message,
      });
    }
  });


  socket.on('message-page', (data) => handleMessagePage(socket, currentUserId, data));

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user-typing', { conversationId, userId });
  });

  socket.on('stop-typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user-stop-typing', { conversationId, userId });
  });


  socket.on('single-chat-send-message', (data) => handleSingleSendMessage(io, socket, currentUserId, data));
  

  socket.on("seen-message", (data) => handleSeenMessage(io, socket, currentUserId, data));
};

export default handleChatEvents;