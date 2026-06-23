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
})



const JobsController={
    createNewJobsServices,
    findMyAllServices,
    deleteJobsServices
};
export default JobsController;