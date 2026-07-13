import { RequestHandler } from "express";



import httpStatus from "http-status";
import catchAsync from "../../utility/catchAsync";
import notificationServices from "./notification.services";
import sendResponse from "../../utility/sendRespone";





const findByAllUsersNotification:RequestHandler=catchAsync(async(req , res)=>{

      const result=await notificationServices.findByAllUsersNotificationIntoDb(req.query, req.user.id);
       sendResponse(res, {
              statusCode: httpStatus.OK,
              success: true,
              message: "successfully  find all  notification ",
              data: result,
            });
});

const markAsRead: RequestHandler = catchAsync(async (req, res) => {
  const result = await notificationServices.markAsReadIntoDb(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "successfully marked notification as read",
    data: result,
  });
});

const markAllAsRead: RequestHandler = catchAsync(async (req, res) => {
  const result = await notificationServices.markAllAsReadIntoDb(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "successfully marked all notifications as read",
    data: result,
  });
});

const deleteNotification: RequestHandler = catchAsync(async (req, res) => {
  const result = await notificationServices.deleteNotificationFromDb(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "successfully deleted notification",
    data: result,
  });
});

const notificationController={
    findByAllUsersNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
};

export default  notificationController;