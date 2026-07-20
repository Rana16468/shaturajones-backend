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
});
const cleanerCompletedJobGraph:RequestHandler=catchAsync(async(req , res)=>{
  const result=await cleanerDistributionService.cleanerCompletedJobGraphIntoDb(req.query, req.user.id);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully  Find My Complete Job Graph ',
      data: result,
    });
});

const findMyAllRecentEarning:RequestHandler=catchAsync(async(req , res)=>{

    const result=await cleanerDistributionService.findMyAllRecentEarningIntoDb(req.query, req.user.id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully  Find My Earning ',
      data: result,
    });
});

const findMyEarningSummary:RequestHandler=catchAsync(async(req , res)=>{
    
  const result=await cleanerDistributionService.findMyEarningSummaryIntoDb(req.user.id);
   sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully  Find My Earning Summary',
      data: result,
    });
})
const cleanerDistributionController={
      findByAllServices, 
      isAcceptedJobOffer,
      deleteJobOffer,
      findMyAcceptedJobList,
      cleanerCompletedJobGraph,
      findMyAllRecentEarning,
      findMyEarningSummary
};
export default cleanerDistributionController

