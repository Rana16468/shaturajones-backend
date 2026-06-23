import express from 'express';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth';
import notificationController from './notification.controller';

const route=express.Router();


route.get("/find_by_all_notification", auth(USER_ROLE.customer,USER_ROLE.cleaner, USER_ROLE.admin,USER_ROLE.superAdmin), notificationController.findByAllUsersNotification);


const NotificationRoute=route;

export default NotificationRoute;