import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import JobsServices from "./services.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";



const createNewJobsServices:RequestHandler=catchAsync(async(req , res)=>{

      const result=await JobsServices.createNewJobsServicesIntoDb(req.user.id, req.body);
      sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Successfully  Recorded",
    data: result,
  });
});

const findMyAllServices:RequestHandler=catchAsync(async(req , res)=>{

      const result=await JobsServices.findMyAllServicesIntoDb(req.user.id, req.query);
   sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Find My All Services",
    data: result,
  });
});

const deleteJobsServices:RequestHandler=catchAsync(async(req , res)=>{



      const result=await JobsServices.deleteJobsServicesIntoDb(req.params.id);
       sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Delete Services",
    data: result,
  });
});

const findBySpecificService:RequestHandler=catchAsync(async(req , res)=>{

      const result=await JobsServices.findBySpecificServiceIntoDb(req.params.id);
      sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Find By Specific Services",
    data: result,
  });
});

const extendDeadline: RequestHandler = catchAsync(async (req, res) => {
  const result = await JobsServices.extendDeadlineIntoDb(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully requested deadline extension",
    data: result,
  });
});

const acceptExtension: RequestHandler = catchAsync(async (req, res) => {
  const result = await JobsServices.acceptExtensionIntoDb(
    req.params.id,
    req.body.accept,
    req.user.id
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully responded to deadline extension",
    data: result,
  });
});

const requestCompletion: RequestHandler = catchAsync(async (req, res) => {
  const result = await JobsServices.requestCompletionIntoDb(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully requested job completion",
    data: result,
  });
});

const acceptCompletion: RequestHandler = catchAsync(async (req, res) => {
  const result = await JobsServices.acceptCompletionIntoDb(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully completed job",
    data: result,
  });
});

const JobsController = {
  createNewJobsServices,
  findMyAllServices,
  deleteJobsServices,
  findBySpecificService,
  extendDeadline,
  acceptExtension,
  requestCompletion,
  acceptCompletion,
};

export default JobsController;