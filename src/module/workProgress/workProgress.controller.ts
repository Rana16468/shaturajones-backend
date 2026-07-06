import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import WorkingProgressServices from "./workProgress.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";


const  beforeWorking:RequestHandler =catchAsync(async (req, res) => {
  const result = await WorkingProgressServices.beforeWorkingIntoDb(req.body, req.user.id);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Recorded Before Working Progress',
    data: result,
  });
});

const  afterWorking:RequestHandler =catchAsync(async (req, res) => {
  const result = await WorkingProgressServices.afterWorkingIntoDb(req.body, req.user.id);
 sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Recorded After Working Progress',
      data: result,
    });
});

const findBySpecificServiceId:RequestHandler =catchAsync(async (req, res) => {
  const result = await WorkingProgressServices.findBySpecificServiceIdIntoDb(req.params.serviceId, req.user.role);
 sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Find By Specific ServiceId',
      data: result,
    });
});

const WorkingProgressController={
      beforeWorking,
      afterWorking,
      findBySpecificServiceId
};
export default WorkingProgressController;