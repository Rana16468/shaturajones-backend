


import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import users from '../user/user.model';


import conversations from '../conversation/conversation.model';
import messages from './message.model';
import ApiError from '../../app/error/ApiError';
import { getSocketIO, onlineUsers } from '../../socket/connectSocket';
import QueryBuilder from '../../app/builder/QueryBuilder';




interface JwtPayloads {
  id: string;
}

interface NewMessagePayload {
  receiverId: string;
  serviceId?: string;
  text: string;
  imageUrl?: string[];
  audioUrl?: string;
}

export const new_message_IntoDb = async (
  user: JwtPayloads,
  data: NewMessagePayload
) => {
  const session = await mongoose.startSession();

  try {
    if (!user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User ID not found in token", "");
    }
    if (!data.receiverId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Receiver ID required", "");
    }
    if (user.id === data.receiverId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "You cannot message yourself", "");
    }

    const receiverExists = await users.exists({ _id: data.receiverId });
    if (!receiverExists) {
      throw new ApiError(httpStatus.NOT_FOUND, "Receiver not found", "");
    }

    session.startTransaction();

   
    const userObjectId = new mongoose.Types.ObjectId(user.id);
    const receiverObjectId = new mongoose.Types.ObjectId(data.receiverId);
    const participantObjectIds = [userObjectId, receiverObjectId];

    
let conversation = await conversations
  .findOne({
    participants: { $all: participantObjectIds, $size: 2 },
    $or: [
      { serviceId:  new mongoose.Types.ObjectId(data.serviceId)  },
      { serviceId: { $exists: false } } 
    ]
  })
  .session(session);

    let isNewConversation = false;

    if (!conversation) {
      try {
        const createdConversation = await conversations.create(
          [
            {
              serviceId: data.serviceId ? new mongoose.Types.ObjectId(data.serviceId) : null,
              participants: participantObjectIds,
            },
          ],
          { session }
        );

        conversation = createdConversation[0];
        isNewConversation = true;
      } catch (err: any) {
        // Fallback for extreme race conditions (e.g., duplicate index errors code 11000)
        if (err.code === 11000) {
          conversation = await conversations
            .findOne({
              serviceId: data.serviceId ? new mongoose.Types.ObjectId(data.serviceId) : null,
              participants: { $all: participantObjectIds, $size: 2 },
            })
            .session(session);
        } else {
          throw err;
        }
      }
    }

    if (!conversation) {
      throw new Error("Conversation creation failed.");
    }

    const io = getSocketIO();
    const roomId = conversation._id.toString();
    let seen = false;

    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      const receiverSocket = io.sockets.sockets.get(receiverSocketId);
      if (receiverSocket && receiverSocket.data.currentConversationId === roomId) {
        seen = true;
      }
    }

    const createdMessage = await messages.create(
      [
        {
          text: data.text.trim(),
          imageUrl: data.imageUrl ?? [],
          audioUrl: data.audioUrl ?? "",
          msgByUserId: userObjectId,
          conversationId: conversation._id,
          seen,
        },
      ],
      { session }
    );

    const message = createdMessage[0];

    await conversations.updateOne(
      { _id: conversation._id },
      { $set: { lastMessage: message._id } },
      { session }
    );

    await session.commitTransaction();

    // -----------------------------------------
    // Socket Room Assignment & State management
    // -----------------------------------------
    const participantsStringArray = [user.id, data.receiverId];
    for (const participant of participantsStringArray) {
      const socketId = onlineUsers.get(participant);
      if (!socketId) continue;

      const participantSocket = io.sockets.sockets.get(socketId);
      if (!participantSocket) continue;

      if (!participantSocket.rooms.has(roomId)) {
        participantSocket.join(roomId);
      }
      // Set the context only for the current active writer
      if (participant === user.id) {
        participantSocket.data.currentConversationId = roomId;
      }
    }

    const populatedMessage = await messages
      .findById(message._id)
      .populate("msgByUserId", "name email photo");

    // Emit Events
    io.to(roomId).emit("new-message", populatedMessage);

    if (seen) {
      io.to(roomId).emit("messages-seen", {
        conversationId: conversation._id,
        seenBy: data.receiverId,
        messageIds: [message._id],
      });
    }

    if (isNewConversation) {
      const payload = {
        conversationId: conversation._id,
        lastMessage: populatedMessage,
      };
      io.to(user.id).emit("conversation-created", payload);
      io.to(data.receiverId).emit("conversation-created", payload);
    }

    return populatedMessage;
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
//update message
const updateMessageById_IntoDb = async (
  messageId: string,
  updateData: Partial<{ text: string; imageUrl: string[] }>
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updated = await messages.findByIdAndUpdate(
      messageId,
      { $set: updateData },
      { new: true, session }
    );

    if (!updated) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Message not found', '');
    }

   
    await conversations.updateMany(
      { lastMessage: messageId },
      { $set: { lastMessage: updated._id } },
      { session }
    );

    const conversation = await conversations.findById(
      updated.conversationId
    ).session(session);

    if (!conversation) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', '');
    }

    await session.commitTransaction();
    session.endSession();


    const io = getSocketIO();
    conversation.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('message-updated', updated);
    });

    return updated;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error updating message',
      error
    );
  }
};


const deleteMessageById_IntoDb = async (messageId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const message = await messages.findById(messageId).session(session);
    if (!message) {
      throw new ApiError(httpStatus.NOT_FOUND, "Message not found", "");
    }

    const conversationId = message.conversationId;


    await message.deleteOne({ _id: messageId }).session(session);

    const conversation = await conversations.findById(conversationId).session(session);
    if (!conversation) {
      throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found", "");
    }

 
    if (conversation.lastMessage?.toString() === messageId.toString()) {
      const newLastMessage = await messages.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .session(session);


      conversation.lastMessage = newLastMessage ? newLastMessage._id : null;
      await conversation.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    conversation.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit("message-deleted", {
        messageId,
        conversationId,
      });
    });

    return {
      success: true,
      message: "Message deleted successfully",
      messageId,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error deleting message",
      error,
    );
  }
};


const findBySpecificConversationInDb = async (
  conversationId: string,
  query: Record<string, unknown>
) => {
  try {
    const baseQuery = messages
      .find({ conversationId })
      .populate([
        {
          path: "msgByUserId",
          select: "name photo",
        },
      ])
      .sort({ updatedAt: -1 }); 

    const messagerQuery = new QueryBuilder(baseQuery, query)
      .search(["participants.name"]) 
      .filter()
      .paginate()
      .fields();

    const allmessage = await messagerQuery.modelQuery;
    const meta = await messagerQuery.countTotal();

    return { meta, allmessage };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error find By Specific Conversation InDb",
      error
    );
  }
};

const single_new_message_IntoDb = async (
  user: JwtPayload,
  data: NewMessagePayload
) => {
  try {
    if (!data || !data.receiverId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "receiverId is required", "");
    }

    const senderId = user._id || user.id;

    if (!senderId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Sender ID missing from token", "");
    }

    if (senderId.toString() === data.receiverId.toString()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "You can't chat with yourself", "");
    }

    // check receiver
    const receiver = await users.findById(data.receiverId).select("_id");
    if (!receiver) {
      throw new ApiError(httpStatus.NOT_FOUND, "Receiver not found", "");
    }

    // find or create conversation
    let isNewConversation = false;

    let conversation = await conversations.findOne({
      participants: { $all: [senderId, data.receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await conversations.create({
        participants: [senderId, data.receiverId],
      });
      isNewConversation = true;
    }

    // create message
    const messageData = {
      text: data.text?.trim() || "",
      imageUrl: data.imageUrl || [],
      audioUrl: data.audioUrl || "",
      msgByUserId: senderId,
      conversationId: conversation._id,
    };

    const savedMessage = await messages.create(messageData);

    await conversations.updateOne(
      { _id: conversation._id },
      {
        lastMessage: savedMessage._id,
        updatedAt: new Date(),
      }
    );


    const populatedMessage = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name photo");


    getSocketIO().to(conversation._id.toString()).emit("new-message", {
      ...populatedMessage?.toObject(),
      conversationId: conversation._id,
    });

    

    return {
      success: true,
      message: "Message sent successfully",
      data: {
        isNewConversation,
        conversationId: conversation._id,
      },
    };
  } catch (error: any) {
    console.error("Error single_new_message_IntoDb:", error);

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Error sending message",
      error
    );
  }
};

const MessageService = {
  new_message_IntoDb,
  updateMessageById_IntoDb,
  deleteMessageById_IntoDb,
  findBySpecificConversationInDb,
  single_new_message_IntoDb 
};

export default MessageService;
