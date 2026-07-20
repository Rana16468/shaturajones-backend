


import httpStatus from 'http-status';
import mongoose from 'mongoose';
import users from '../user/user.model';


import conversations from '../conversation/conversation.model';
import messages from './message.model';
import ApiError from '../../app/error/ApiError';
import { getSocketIO, onlineUsers } from '../../socket/connectSocket';
import QueryBuilder from '../../app/builder/QueryBuilder';
import { sendFileToCloudinary } from '../../utility/Cloudinary/sendFileToCloudinary';
import catchError from '../../app/error/catchError';
import deleteFileFromCloudinary from '../../utility/Cloudinary/deleteFileFromCloudinary';




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

const new_message_IntoDb = async (
  user: JwtPayloads,
  data: NewMessagePayload
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction(); 

    // ১. ভ্যালিডেশন চেক
    if (!user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User ID not found in token", "");
    }
    if (!data.receiverId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Receiver ID required", "");
    }
    if (user.id.toString() === data.receiverId.toString()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "You cannot message yourself", "");
    }

    const receiverExists = await users.exists({ _id: data.receiverId }).session(session);
    if (!receiverExists) {
      throw new ApiError(httpStatus.NOT_FOUND, "Receiver not found", "");
    }

    // ⚡ ২. ক্লাউডিনারি ফাইল আপলোড (Promise.all দিয়ে ফাস্ট প্যারালাল আপলোড)
    let uploadedImages: string[] = [];
    let uploadedAudio: string = "";

    // ক) একাধিক ছবি একসাথে আপলোড
    if (data.imageUrl && Array.isArray(data.imageUrl) && data.imageUrl.length > 0) {
      const uploadPromises = data.imageUrl.map((localPath, i) => {
        const fileName = `${Date.now()}-chat-img-${i}`;
        return sendFileToCloudinary(fileName, localPath);
      });
      const uploadedResults = await Promise.all(uploadPromises);
      uploadedImages = uploadedResults.map((res) => res.secure_url);
    }

    // খ) অডিও ফাইল আপলোড
    if (data.audioUrl && typeof data.audioUrl === 'string') {
      const fileName = `${Date.now()}-chat-audio`;
      const uploaded = await sendFileToCloudinary(fileName, data.audioUrl);
      uploadedAudio = uploaded.secure_url;
    }

    // ৩. অবজেক্ট আইডি কনভার্সন
    const userObjectId = new mongoose.Types.ObjectId(user.id);
    const receiverObjectId = new mongoose.Types.ObjectId(data.receiverId);
    const participantObjectIds = [userObjectId, receiverObjectId];

    // ৪. কনভারসেশন খোঁজা বা তৈরি করা
    let conversation = await conversations
      .findOne({
        participants: { $all: participantObjectIds, $size: 2 },
        $or: [
          { serviceId: data.serviceId ? new mongoose.Types.ObjectId(data.serviceId) : { $exists: false } },
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
        // Race condition / Duplicate key (11000) হ্যান্ডলিং
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
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Conversation creation failed.", "");
    }

    // ⚡ ৫. সকেট ও সিন (Seen) স্ট্যাটাস চেক
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

    // ৬. মেসেজ ক্রিয়েট করা
    const createdMessage = await messages.create(
      [
        {
          text: data.text ? data.text.trim() : "",
          imageUrl: uploadedImages, 
          audioUrl: uploadedAudio,   
          msgByUserId: userObjectId,
          conversationId: conversation._id,
          seen,
        },
      ],
      { session }
    );

    const message = createdMessage[0];

    // ৭. কনভারসেশনের লাস্ট মেসেজ আপডেট করা
    await conversations.updateOne(
      { _id: conversation._id },
      { $set: { lastMessage: message._id, updatedAt: new Date() } },
      { session }
    );

    // ট্রানজেকশন সফলভাবে কমিট করা
    await session.commitTransaction();

    // ⚡ ৮. ডাইনামিক সকেট রুম জয়েনিং
    const participantsStringArray = [user.id, data.receiverId];
    for (const participant of participantsStringArray) {
      const socketId = onlineUsers.get(participant);
      if (!socketId) continue;

      const participantSocket = io.sockets.sockets.get(socketId);
      if (!participantSocket) continue;

      if (!participantSocket.rooms.has(roomId)) {
        participantSocket.join(roomId);
      }
      if (participant === user.id) {
        participantSocket.data.currentConversationId = roomId;
      }
    }

    // ৯. পপুলেটেড মেসেজ ডাটা রিট্রাইভ
    const populatedMessage = await messages
      .findById(message._id)
      .populate("msgByUserId", "name email photo")
      .lean();

    // 📢 ১০. সকেট ইভেন্ট ইমিট করা
    io.to(roomId).emit("new-message", populatedMessage);

    if (seen) {
      io.to(roomId).emit("messages-seen", {
        conversationId: conversation._id,
        seenBy: data.receiverId,
        messageIds: [message._id],
      });
    }

    if (isNewConversation) {
      const conversationPayload = {
        conversationId: conversation._id,
        lastMessage: populatedMessage,
      };
      // 🛠️ ফিক্সড: userId এর পরিবর্তে user.id ব্যবহার করা হলো
      io.to(user.id).emit("conversation-created", conversationPayload);
      io.to(data.receiverId).emit("conversation-created", conversationPayload);
    }

    return populatedMessage;

  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error in new_message_IntoDb:", error);
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

  try {
    session.startTransaction();

    const existingMessage = await messages.findById(messageId).session(session);
    if (!existingMessage) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Message not found', '');
    }

    const finalUpdateData: any = {};
    if (updateData.text !== undefined) {
      finalUpdateData.text = updateData.text.trim();
    }

    if (updateData.imageUrl && Array.isArray(updateData.imageUrl)) {
      let uploadedImages: string[] = [];
      
      for (let i = 0; i < updateData.imageUrl.length; i++) {
        const localPath = updateData.imageUrl[i];
        const fileName = `${Date.now()}-update-chat-img-${i}`;
        const uploaded = await sendFileToCloudinary(fileName, localPath);
        uploadedImages.push(uploaded.secure_url);
      }
      
      finalUpdateData.imageUrl = uploadedImages;
    }

    
    const updated = await messages.findByIdAndUpdate(
      messageId,
      { $set: finalUpdateData },
      { new: true, session }
    );

    if (!updated) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Message not found', '');
    }

  
    const conversation = await conversations
      .findById(updated.conversationId)
      .session(session);

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
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
    
    throw catchError(error);
  }
};


const deleteMessageById_IntoDb = async (messageId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const message = await messages.findById(messageId).session(session);
    if (!message) {
      throw new ApiError(httpStatus.NOT_FOUND, "Message not found", "");
    }
    const conversationId = message.conversationId;

    if (message.imageUrl && Array.isArray(message.imageUrl) && message.imageUrl.length > 0) {
      for (const imgUrl of message.imageUrl) {
        await deleteFileFromCloudinary(imgUrl);
      }
    }

    if (message.audioUrl && typeof message.audioUrl === 'string' && message.audioUrl !== "") {
      await deleteFileFromCloudinary(message.audioUrl);
    }

    await message.deleteOne().session(session);

    const conversation = await conversations.findById(conversationId).session(session);
    if (!conversation) {
      throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found", "");
    }

    if (conversation.lastMessage?.toString() === messageId.toString()) {
      const newLastMessage = await messages
        .findOne({ conversationId })
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
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
    
    throw catchError(error);
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
  data: NewMessagePayload,
  userId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const senderId = userId;

    if (!senderId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User ID not found in token", "");
    }
    if (!data.receiverId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Receiver ID required", "");
    }
    if (senderId.toString() === data.receiverId.toString()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "You cannot message yourself", "");
    }

    // ১. রিসিভার এক্সিস্ট করে কিনা চেক
    const receiverExists = await users.exists({ _id: data.receiverId }).session(session);
    if (!receiverExists) {
      throw new ApiError(httpStatus.NOT_FOUND, "Receiver not found", "");
    }

    // ⚡ ২. ক্লাউডিনারি ফাইল আপলোড (যেহেতু রাউটার থেকে লোকাল পাথ বডিতে আসছে)
    let uploadedImages: string[] = [];
    let uploadedAudio = "";

    // ক) ইমেজ ফাইলগুলো প্যারালালি আপলোড
    if (data.imageUrl && Array.isArray(data.imageUrl) && data.imageUrl.length > 0) {
      const imageUploadPromises = data.imageUrl.map((localPath, i) => {
        const fileName = `${Date.now()}-chat-img-${senderId}-${i}`;
        return sendFileToCloudinary(fileName, localPath);
      });
      const uploadedResults = await Promise.all(imageUploadPromises);
      uploadedImages = uploadedResults.map((res) => res.secure_url);
    }

    // খ) অডিও ফাইল আপলোড
    if (data.audioUrl && typeof data.audioUrl === 'string') {
      const fileName = `${Date.now()}-chat-audio-${senderId}`;
      const uploaded = await sendFileToCloudinary(fileName, data.audioUrl);
      uploadedAudio = uploaded.secure_url;
    }

    // ৩. অবজেক্ট আইডি কনভার্সন
    const userObjectId = new mongoose.Types.ObjectId(senderId);
    const receiverObjectId = new mongoose.Types.ObjectId(data.receiverId);
    const participantObjectIds = [userObjectId, receiverObjectId];

    // ৪. কনভারসেশন ফাইন্ড বা ক্রিয়েট (ServiceId সহ)
    let conversation = await conversations
      .findOne({
        participants: { $all: participantObjectIds, $size: 2 },
        $or: [
          { serviceId: data.serviceId ? new mongoose.Types.ObjectId(data.serviceId) : { $exists: false } },
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
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Conversation creation failed", "");
    }

    // ৫. সকেট রুম ও সিন (Seen) স্ট্যাটাস চেক
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

    // ৬. মেসেজ ডেটাবেজে ক্রিয়েট করা
    const [savedMessage] = await messages.create(
      [
        {
          text: data.text ? data.text.trim() : "",
          imageUrl: uploadedImages,
          audioUrl: uploadedAudio,
          msgByUserId: userObjectId,
          conversationId: conversation._id,
          seen,
        },
      ],
      { session }
    );

  
    await conversations.updateOne(
      { _id: conversation._id },
      { $set: { lastMessage: savedMessage._id, updatedAt: new Date() } },
      { session }
    );

  
    await session.commitTransaction();
    session.endSession();


    const participantsStringArray = [senderId.toString(), data.receiverId.toString()];
    for (const participant of participantsStringArray) {
      const socketId = onlineUsers.get(participant);
      if (!socketId) continue;

      const participantSocket = io.sockets.sockets.get(socketId);
      if (!participantSocket) continue;

      if (!participantSocket.rooms.has(roomId)) {
        participantSocket.join(roomId);
      }
      if (participant === senderId.toString()) {
        participantSocket.data.currentConversationId = roomId;
      }
    }

   
    const populatedMessage = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name email photo")
      .lean();

    io.to(roomId).emit("new-message", populatedMessage);

    if (seen) {
      io.to(roomId).emit("messages-seen", {
        conversationId: conversation._id,
        seenBy: data.receiverId,
        messageIds: [savedMessage._id],
      });
    }

    if (isNewConversation) {
      const conversationPayload = {
        conversationId: conversation._id,
        lastMessage: populatedMessage,
      };
      io.to(senderId.toString()).emit("conversation-created", conversationPayload);
      io.to(data.receiverId.toString()).emit("conversation-created", conversationPayload);
    }

    return populatedMessage;

  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();

    console.error("Error single_new_message_IntoDb:", error);
    throw catchError(error);
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
