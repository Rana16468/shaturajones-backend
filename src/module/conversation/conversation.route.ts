import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import ConversationController from './conversation.controller';





const router = express.Router();

router.get(
  '/get-chat-list',
  auth(USER_ROLE.customer, USER_ROLE.cleaner),
  ConversationController.getChatList,
);

router.get("/get_single_conversation", auth(USER_ROLE.customer, USER_ROLE.cleaner),ConversationController.getSingleConversationList)
router.get("/get_group_conversation/:eventId", auth(USER_ROLE.customer, USER_ROLE.cleaner), ConversationController.getGroupConversationList)

export const conversationRoutes = router;