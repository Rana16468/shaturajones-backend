import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import services from "../services/services.model";
import { TWorkProgress } from "./workProgress.interface";
import workprogress from "./workProgress.model";
import mongoose from "mongoose";


const beforeWorkingIntoDb = async (
  payload: Partial<TWorkProgress>,
  userId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isWorkProgress = await workprogress
      .findOne({
        serviceId: payload.serviceId,
        cleanerId: userId,
        isDelete: { $ne: true },
      })
      .session(session)
      .lean();

    if (isWorkProgress) {
      await session.abortTransaction();
      session.endSession();

      return {
        success: true,
        message: "Before working progress already done",
      };
    }

    const isExistService = await services
      .findOne({
        _id: payload.serviceId,
      })
      .select("jobId userId")
      .session(session)
      .lean();

    if (!isExistService) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Service not found",
        ""
      );
    }

    const [result] = await workprogress.create(
      [
        {
          ...payload,
          cleanerId: userId,
          customerId: isExistService.userId,
          jobId: isExistService.jobId,
        },
      ],
      { session }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        "Failed to create work progress",
        ""
      );
    }
    const updatedService = await services.findOneAndUpdate(
      {
        _id: payload.serviceId,
        isAdvancePayment: true,
        isAccepted: true,
      },
      {
        $set: {
          isServiceStarted: true,
        },
      },
      {
        new: true,
        runValidators: true,
        session,
      }
    );

    if (!updatedService) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to update service",
        ""
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Successfully recorded before working progress",
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw catchError(error);
  }
};

const afterWorkingIntoDb = async (
  payload: Partial<TWorkProgress>,
  userId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isServiceEnded = await services
      .findOne({
        _id: payload.serviceId,
        isServiceStarted: true,
        isAccepted: true,
        isAdvancePayment: true,
        isServiceEed: false,
      })
      .select("jobId userId")
      .session(session)
      .lean();


    if (!isServiceEnded) {
      await session.abortTransaction();
      session.endSession();

      return {
        success: false,
        message: "Service already ended or not started.",
      };
    }
    const [result] = await workprogress.create(
      [
        {
          ...payload,
          cleanerId: userId,
          customerId: isServiceEnded.userId,
          jobId: isServiceEnded.jobId,
        },
      ],
      { session }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        "Failed to create work progress",
        ""
      );
    }

    const updatedService = await services.findOneAndUpdate(
      {
        _id: payload.serviceId,
        isAdvancePayment: true,
        isAccepted: true,
        isServiceStarted: true,
        isServiceEed: false,
        isCompletePayment: false,
      },
      {
        $set: {
          isServiceEed: true,
        },
      },
      {
        new: true,
        runValidators: true,
        session,
      }
    );

    if (!updatedService) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to update service",
        ""
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Successfully recorded after working progress.",
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw catchError(error);
  }
};



const WorkingProgressServices={
      beforeWorkingIntoDb,
      afterWorkingIntoDb
}

export default WorkingProgressServices;