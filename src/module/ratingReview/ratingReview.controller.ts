import { NextFunction, Request, RequestHandler, Response } from "express";
import catchAsync from "../../utility/catchAsync";
import ReviewRatingServices from "./ratingReview.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";



const createReviewRating:RequestHandler=catchAsync(async(req:Request,res:Response,next:NextFunction)=>{
  const result = await ReviewRatingServices.createReviewRatingIntoDb(req.body, req.user.id);
  sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully Created Review Rating',
      data: result,
    });
})

const ReviewRatingController={
      createReviewRating
};

export default ReviewRatingController;


