import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import services from "../services/services.model";
import { IRatingReview } from "./ratingReview.interface";
import ratingreviews from "./ratingReview.model";
import cleanerdistributions from "../cleanerDistribusation/cleanerDistribusation.model";
import createjobs from "../createJobs/createJobs.model";

const createReviewRatingIntoDb = async (
  payload: IRatingReview,
  customerId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isReviewRatingExist = await services
      .findOne(
        {
          _id: payload.serviceId,
              isAccepted: true,
              isAdvancePayment: true,
              isCompletePayment: true,
              isServiceStarted: true,
              isServiceEed: true,
              isDelete: { $ne: true },

        },
        null,
        { session }
      )
      .select("_id")
      .lean();

    if (!isReviewRatingExist) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Service not found.",
        ""
      );
    }

    const isServicesExist = await services
      .findOne(
        {
          _id: payload.serviceId,
          isAccepted: true,
          isAdvancePayment: true,
          isCompletePayment: true,
          isServiceStarted: true,
          isServiceEed: true,
          isDelete: { $ne: true },
        },
        null,
        { session }
      )
      .select("jobId")
      .lean();

    if (!isServicesExist) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Service is not completed yet.",
        ""
      );
    }

    const alreadyReviewed = await ratingreviews.findOne(
      {
        serviceId: payload.serviceId,
        customerId,
        isDelete: { $ne: true },
      },
      null,
      { session }
    );

    if (alreadyReviewed) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "You have already submitted a review for this service.",
        ""
      );
    }

    const result = await ratingreviews.create(
      [
        {
          ...payload,
          customerId,
        },
      ],
      { session }
    );

    await cleanerdistributions.findOneAndUpdate(
      {
        serviceId: payload.serviceId,
        isDelete: { $ne: true },
      },
      {
        $set: {
          isReview: true,
        },
      },
      {
        new: true,
        session,
      }
    );

    const averageRating = await ratingreviews.aggregate(
      [
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "service",
          },
        },
        {
          $unwind: "$service",
        },
        {
          $match: {
            "service.jobId": isServicesExist.jobId,
            isDelete: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$service.jobId",
            averageRating: {
              $avg: "$rating",
            },
            totalReviews: {
              $sum: 1,
            },
          },
        },
      ],
      { session }
    );

    const rating =
      averageRating.length > 0
        ? Number(averageRating[0].averageRating.toFixed(1))
        : 0;

    const totalReviews =
      averageRating.length > 0 ? averageRating[0].totalReviews : 0;

    await createjobs.findByIdAndUpdate(
      isServicesExist.jobId,
      {
        $set: {
          rating,
          totalReviews,
        },
      },
      {
        new: true,
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();

    return result[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw catchError(error);
  }
};

const ReviewRatingServices = {
  createReviewRatingIntoDb,
};

export default ReviewRatingServices;