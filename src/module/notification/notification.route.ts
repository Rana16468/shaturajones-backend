import express from 'express';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth';
import notificationController from './notification.controller';

const route=express.Router();


route.get("/find_by_all_notification", auth(USER_ROLE.customer,USER_ROLE.cleaner, USER_ROLE.admin,USER_ROLE.superAdmin), notificationController.findByAllUsersNotification);
route.patch("/mark_as_read/:id", auth(USER_ROLE.customer, USER_ROLE.cleaner, USER_ROLE.admin, USER_ROLE.superAdmin), notificationController.markAsRead);
route.patch("/mark_all_as_read", auth(USER_ROLE.customer, USER_ROLE.cleaner, USER_ROLE.admin, USER_ROLE.superAdmin), notificationController.markAllAsRead);
route.delete("/delete/:id", auth(USER_ROLE.customer, USER_ROLE.cleaner, USER_ROLE.admin, USER_ROLE.superAdmin), notificationController.deleteNotification);

const NotificationRoute=route;

export default NotificationRoute;