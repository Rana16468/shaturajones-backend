import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import CreateJobServices from "./createJobs.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";


const createJob:RequestHandler=catchAsync(async(req , res)=>{

      const result=await CreateJobServices.createJobIntoDb(req.body);
sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Successfully Create Jobs",
    data: result,
  });

});


const  findByAllJobs:RequestHandler=catchAsync(async(req , res)=>{

  const result=await CreateJobServices.findByAllJobsIntoDb(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Find By All Jobs",
    data: result,
  });
});

const findBySpecificJobs:RequestHandler=catchAsync(async(req , res)=>{

    const result=await CreateJobServices.findBySpecificJobsIntoDb(req.params.id);
    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Find By Specific Jobs",
    data: result,
  });
});


const updateJobs:RequestHandler=catchAsync(async(req , res)=>{

    const result=await CreateJobServices.updateJobsIntoDb(req.params.id, req.body);
     sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Update Specific Jobs",
    data: result,
  });
});

const deleteJobs:RequestHandler=catchAsync(async(req , res)=>{

    const result=await CreateJobServices.deleteJobsIntoDb(req.params.id);
     sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Delete Jobs",
    data: result,
  });
})

const CreateJobController={
   createJob ,
   findByAllJobs,
   findBySpecificJobs,
   updateJobs,
   deleteJobs

};

export default CreateJobController;

