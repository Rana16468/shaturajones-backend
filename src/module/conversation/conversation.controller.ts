import { RequestHandler } from 'express';

import httpStatus from 'http-status';
import catchAsync from '../../utility/catchAsync';
import ConversationService from './conversation.services';
import sendResponse from '../../utility/sendRespone';


const getChatList: RequestHandler = catchAsync(async (req, res) => {
  const result = await ConversationService.getConversation(
    req?.user?.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});








const getSingleConversationList:RequestHandler=catchAsync(async(req , res)=>{

     const result=await  ConversationService.getSingleConversationListIntoDb(req.user.id, req.query);
     sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully  find  my conversation list',
    data: result,
  }); 
});
const getGroupConversationList:RequestHandler=catchAsync(async(req , res)=>{

     const result=await  ConversationService.getGroupConversationListIntoDb(req.params.eventId,req.user.id, req.query);
     sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully  find  group conversation list',
    data: result,
  }); 
});



const ConversationController = {
  getChatList,
    getSingleConversationList,
    getGroupConversationList
};

export default ConversationController;