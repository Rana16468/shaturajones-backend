import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import services from "../services/services.model";
import { TWorkProgress } from "./workProgress.interface";
import workprogress from "./workProgress.model";
import mongoose from "mongoose";
import { USER_ROLE } from "../user/user.constant";
import { cache } from "../createJobs/createJobs.constant";
import { sendPushNotification } from "../../utility/notificationHelper";
import users from "../user/user.model";
import { sendFileToCloudinary } from "../../utility/Cloudinary/sendFileToCloudinary";


const beforeWorkingIntoDb = async (
  payload: Partial<TWorkProgress> & { photo?: any[] }, // photo টাইপ হ্যান্ডেল করার জন্য
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
      .findOne({ _id: payload.serviceId })
      .session(session)
      .lean();

    if (!isExistService) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found", "");
    }

    if (!isExistService.isAdvancePayment || !isExistService.isAccepted) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Service cannot be started. Ensure advance payment is completed and service is accepted.",
        ""
      );
    }

    let uploadedPhotos: string[] = [];
    if (payload.photo && Array.isArray(payload.photo)) {
      for (let i = 0; i < payload.photo.length; i++) {
        const fileObj = payload.photo[i];
        const fileName = `${Date.now()}-before-work-${i}`;

        const uploaded = await sendFileToCloudinary(fileName, fileObj.photo);
        uploadedPhotos.push(uploaded.secure_url);
      }
    }

   
    const [result] = await workprogress.create(
      [
        {
          ...payload,
          photo: uploadedPhotos.map(url => ({ photo: url })), 
          cleanerId: userId,
          customerId: isExistService.userId,
          jobId: isExistService.jobId,
        },
      ],
      { session }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create work progress",
        ""
      );
    }


    const updatedService = await services.findOneAndUpdate(
      { _id: payload.serviceId },
      { $set: { isServiceStarted: true } },
      { new: true, runValidators: true, session }
    );

    if (!updatedService) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to update service status",
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
  payload: Partial<TWorkProgress> & { photo?: any[] },
  userId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const activeService = await services
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

    if (!activeService) {
      await session.abortTransaction();
      session.endSession();

      return {
        success: false,
        message: "Service already ended or not started.",
      };
    }

    
    const provider = await users.findById(userId).session(session).lean();
    const providerName = provider?.name || 'A cleaner';

    let uploadedPhotos: string[] = [];
    if (payload.photo && Array.isArray(payload.photo)) {
      for (let i = 0; i < payload.photo.length; i++) {
        const fileObj = payload.photo[i];
        const fileName = `${Date.now()}-after-work-${i}`;
       
        const uploaded = await sendFileToCloudinary(fileName, fileObj.photo);
        uploadedPhotos.push(uploaded.secure_url);
      }
    }


    const [result] = await workprogress.create(
      [
        {
          ...payload,
          photo: uploadedPhotos.map(url => ({ photo: url })), 
          cleanerId: userId,
          customerId: activeService.userId,
          jobId: activeService.jobId,
        },
      ],
      { session }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create work progress",
        ""
      );
    }

    
    const updatedService = await services.findOneAndUpdate(
      {
        _id: payload.serviceId,
        isServiceEnded: false, 
      },
      {
        $set: {
          isCompletionRequested: true,
          isServiceEed:false
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
        "Failed to update service status",
        ""
      );
    }

   
    await session.commitTransaction();
    session.endSession();

    
    try {
      await sendPushNotification(
        activeService.userId.toString(),
        "Job Completed!",
        `${providerName} has marked your job as completed.`,
        { type: "service", serviceId: updatedService._id.toString() }
      );
    } catch (pushError) {
      console.error("Push notification failed to send:", pushError);
      
    }

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

const findBySpecificServiceIdIntoDb = async (
  serviceId: string,
  role: string
) => {
  try {
    const cacheKey = `work_progress:${serviceId}:${role}`;

    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const populatePath =
      role === USER_ROLE.customer
        ? "customerId"
        : role === USER_ROLE.cleaner
        ? "cleanerId"
        : null;

    if (!populatePath) {
      throw new Error("Invalid user role.");
    }

    const workProgress = await workprogress
      .findOne({
        serviceId,
        isDelete: { $ne: true },
      })
      .populate([
        {
          path: populatePath,
          select: "name email location photo country phoneNumber",
        },
        {
          path: "serviceId",
          select:
            "jobId selectedDate isAccepted isServiceStarted isServiceEed isAdvancePayment isCompletePayment totalAmount",
        },
      ])
      .lean();

    cache.set(cacheKey, workProgress);

    return workProgress;
  } catch (error) {
    throw catchError(error);
  }
};



const WorkingProgressServices={
      beforeWorkingIntoDb,
      afterWorkingIntoDb,
      findBySpecificServiceIdIntoDb
}

export default WorkingProgressServices;