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

const isAcceptedJobOffer:RequestHandler=catchAsync(async(req , res)=>{

        const result=await cleanerDistributionService.isAcceptedJobOfferIntoDb(req.user.id, req.body);
         sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully  Accepted Jobs Offer ',
      data: result,
    });
});

const deleteJobOffer:RequestHandler=catchAsync(async(req , res)=>{

        const result=await cleanerDistributionService.deleteJobOfferIntoDb(req.params.id, req.user.id);
         sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully Rejected ',
      data: result,
    });
});

const findMyAcceptedJobList:RequestHandler=catchAsync(async(req , res)=>{

      const result=await cleanerDistributionService.findMyAcceptedJobListIntoDb(req.user.id, req.query);
      sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully  Find My Job List ',
      data: result,
    });
})

const cleanerDistributionController={
      findByAllServices, 
      isAcceptedJobOffer,
      deleteJobOffer,
      findMyAcceptedJobList
};
export default cleanerDistributionController

