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





const notificationController={
    findByAllUsersNotification
   
};

export default  notificationController