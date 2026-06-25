import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import cleanerDistributionService from "./cleanerDistribusation.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";



const findByAllServices:RequestHandler=catchAsync(async(req , res)=>{

       const result=await cleanerDistributionService.findByAllServicesIntoDb(req.query);
      sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully  Find By All  Jobs ',
      data: result,
    });

});

const cleanerDistributionController={
      findByAllServices
};
export default cleanerDistributionController

