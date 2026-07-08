/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose from 'mongoose';
import users from '../user/user.model';
import messages from '../message/message.model';
import conversations from './conversation.model';
import QueryBuilder from '../../app/builder/QueryBuilder';
import catchError from '../../app/error/catchError';






const getConversation = async (
  profileId: string,
  query: Record<string, unknown>,
) => {
  const profileObjectId = new mongoose.Types.ObjectId(profileId);
  const searchTerm = query.searchTerm as string;

  let userSearchFilter = {};

  if (searchTerm) {
    const matchingUsers = await users.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      '_id',
    );

    const matchingUserIds = matchingUsers?.map((user) => user._id);
    userSearchFilter = {
      participants: { $in: matchingUserIds },
    };
  }
  const currentUserConversationQuery = new QueryBuilder(
    conversations.find({
      participants: profileObjectId,
      ...userSearchFilter,
    })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants', select: 'name photo _id email' })
      .populate('lastMessage'),
    query,
  )
    .fields()
    .filter()
    .paginate()
    .sort();

  const currentUserConversation = await currentUserConversationQuery.modelQuery;

  const conversationList = await Promise.all(
    currentUserConversation.map(async (conv: any) => {
      const otherUser = conv.participants.find(
        (user: any) => user._id.toString() !== profileId,
      );

      const unseenCount = await messages.countDocuments({
        conversationId: conv._id,
        msgByUserId: { $ne: profileObjectId },
        seen: false,
      });

      return {
        _id: conv._id,
        userData: {
          _id: otherUser?._id,
          name: otherUser?.name,
          profileImage: otherUser?.photo,
          email: otherUser?.email,
        },
        unseenMsg: unseenCount,
        lastMsg: conv.lastMessage,
      };
    }),
  );

  const meta = await currentUserConversationQuery.countTotal();

  return {
    meta,
    result: conversationList,
  };
};




const getSingleConversationListIntoDb = async (
  currentUserId: string,
  query: Record<string, unknown>
) => {
  try {
   
    const baseQuery = conversations
      .find({
        participants: currentUserId,
      }).sort({ updatedAt: -1 })
      .populate([
        {
          path: "participants",
          match: { _id: { $ne: currentUserId } },
          select: "name photo email",
        },
        {
          path: "lastMessage",
          select: "text createdAt seen",
        },
      ])
      .sort({ updatedAt: -1 });

    
    const { seen, ...safeQuery } = query as any;

    const conversationQuery = new QueryBuilder(baseQuery, safeQuery)
      .filter()
      .sort()
      .paginate()
      .fields();

    let allConversations = await conversationQuery.modelQuery;
   const meta = await conversationQuery.countTotal();


  

   

   

    

    return {
      meta,
      allConversations
    };
  } catch (error) {
    throw catchError(error);
  }
    
};




// group conversation list
 
const getGroupConversationListIntoDb = async (serviceId: string, currentUserId:string, query:  Record<string, unknown>) => {
  try {
    const baseQuery = conversations
      .find({
        serviceId
      }).populate([
          {
             path: "participants",
       
        select: "name photo email",
          },
         {
          path: "lastMessage",
          select: "text  createdAt",
         
        },
        ]) 
   
      .sort({ updatedAt: -1 })
      

    const conversationQuery = new QueryBuilder(baseQuery, query)
      .filter()
      .sort()
      .paginate()
      .fields();

    const allConversations = await conversationQuery.modelQuery;
    const meta = await conversationQuery.countTotal();

    return { meta, allConversations };
  } catch (error) {
    
    throw catchError(error);
  }
};







const ConversationService = {
  getConversation,
   getSingleConversationListIntoDb,
   getGroupConversationListIntoDb
};

export default ConversationService;
