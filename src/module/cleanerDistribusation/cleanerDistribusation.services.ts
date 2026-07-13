import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { cache } from "../createJobs/createJobs.constant";
import { TCleanerDistribution } from "./cleanerDistribusation.interface";
import cleanerdistributions from "./cleanerDistribusation.model";
import services from "../services/services.model";
import notifications from "../notification/notification.model";
import { getSocketIO } from "../../socket/connectSocket";
import payments from "../payment_gateway/payment_gateway.model";
import { payment_status } from "../payment_gateway/payment_gateway.constant";
import mongoose from "mongoose";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { sendPushNotification } from "../../utility/notificationHelper";
import users from "../user/user.model";

const isAcceptedJobOfferIntoDb = async (
    userId: string,
    payload: TCleanerDistribution
) => {
    try {

        const alreadyAccepted = await cleanerdistributions.findOne({
            serviceId: payload.serviceId,
            userId,
        });

        if (alreadyAccepted) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "You already accepted this service.",
                ""
            );
        }

        const acceptedService = await services.findOneAndUpdate(
            {
                _id: payload.serviceId,
                isAccepted: false,
                isServiceStarted: false,
                isDelete: false,
            },
            {
                $set: {
                    isAccepted: true,
                },
            },
            {
                new: true,
            }
        );

        if (!acceptedService) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "This service has already been accepted.",
                ""
            );
        }

        await cleanerdistributions.create({
            ...payload,
            userId,
        });

        const notification = new notifications({
            userId: acceptedService.userId,
            title: "Service Accepted",
            message: "A cleaner has accepted your service request.",
            isRead: false,
        });

        await notification.save();

        try {
            const io = getSocketIO();

            io.to(`user::${acceptedService.userId}`).emit("notification", {
                title: "Service Accepted",
                message: "A cleaner has accepted your service request.",
                type: "service",
                timestamp: new Date().toISOString(),
            });
        } catch {
            console.log("Socket not initialized.");
        }

        // --- Push Notification ---
        const provider = await users.findById(userId);
        const providerName = provider?.name || 'A cleaner';
        await sendPushNotification(
            acceptedService.userId.toString(),
            "Job Accepted!",
            `${providerName} has accepted your service request.`,
            { type: "service", serviceId: acceptedService._id.toString() }
        );

        cache.flushAll();

        return {
            success: true,
            message: "Service accepted successfully.",
        };
    } catch (error) {
        throw catchError(error);
    }
};

const findByAllServicesIntoDb = async (
  query: Record<string, any>
) => {
  try {
    const cacheKey = `payments_${JSON.stringify(query)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;

    const matchStage: any = {
      payment_status: payment_status.paid,
    };

    if (query.searchTerm) {
      matchStage.$or = [
        {
          payable_name: {
            $regex: query.searchTerm,
            $options: "i",
          },
        },
        {
          payable_email: {
            $regex: query.searchTerm,
            $options: "i",
          },
        },
        {
          payment_intent: {
            $regex: query.searchTerm,
            $options: "i",
          },
        },
      ];
    }

    const pipeline: any[] = [
      {
        $match: matchStage,
      },


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
          "service.isAdvancePayment": true,
          "service.isCompletePayment": false,
          "service.isAccepted": false,
          "service.isDelete": {
            $ne: true,
          },
        },
      },

      // User Lookup
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },

      // Remove duplicate services
      {
        $group: {
          _id: "$service._id",

          paymentId: {
            $first: "$_id",
          },

          currency: {
            $first: "$currency",
          },

          payment_status: {
            $first: "$payment_status",
          },

          createdAt: {
            $max: "$createdAt",
          },

          service: {
            $first: "$service",
          },

          user: {
            $first: "$user",
          },
        },
      },

      {
        $project: {
          _id: "$paymentId",
          currency: 1,
          payment_status: 1,
          createdAt: 1,

          user: {
            _id: "$user._id",
            name: "$user.name",
            photo:"$user.photo",
            
          },

          service: {
            _id: "$service._id",
            jobId: "$service.jobId",
            selectedDate: "$service.selectedDate",
            isAccepted: "$service.isAccepted",
            isAdvancePayment: "$service.isAdvancePayment",
            isCompletePayment: "$service.isCompletePayment",
            isServiceStarted: "$service.isServiceStarted",
            isServiceEed: "$service.isServiceEed",
            totalAmount: "$service.totalAmount",
          },
        },
      },

      // Lookup job details from createjobs collection
      {
        $lookup: {
          from: "createjobs",
          localField: "service.jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      {
        $unwind: {
          path: "$job",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add job info into service
      {
        $addFields: {
          "service.jobId": {
            _id: "$job._id",
            jobName: "$job.jobName",
            jobType: "$job.jobType",
            photo: "$job.photo",
          },
        },
      },
      {
        $project: {
          job: 0,
        },
      },

      {
        $facet: {
          meta: [
            {
              $count: "total",
            },
          ],

          data: [
            {
              $sort: {
                [sortBy]: sortOrder,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
        },
      },
    ];

    const result = await payments.aggregate(pipeline);

    const total = result[0]?.meta[0]?.total || 0;

    const response = {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: result[0]?.data || [],
    };

    cache.set(cacheKey, response);

    return response;
  } catch (error) {
    throw catchError(error);
  }
};

const deleteJobOfferIntoDb = async (
  serviceId: string,
  cleanerId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Find service
    const service = await services
      .findOne(
        {
          _id: serviceId,
          isAccepted: true,
          isDelete: false,
        },
        {
          userId: 1,
        }
      )
      .session(session);

    if (!service) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Service not found or already cancelled.",
        ""
      );
    }

    // Reset service status
    await services.findByIdAndUpdate(
      serviceId,
      {
        $set: {
          isAccepted: false,
        },
      },
      {
        new: true,
        session,
      }
    );
    await cleanerdistributions.findOneAndDelete(
      {
        serviceId,
        userId: cleanerId,
      },
      {
        session,
      }
    );

    await notifications.create(
      [
        {
          userId: service.userId,
          title: "Service Cancelled",
          message:
            "The cleaner has cancelled the accepted service.",
          isRead: false,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    cache.flushAll();

    try {
      const io = getSocketIO();

      io.to(`user::${service.userId}`).emit("notification", {
        title: "Service Cancelled",
        message: "The cleaner has cancelled the accepted service.",
        type: "service",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.log("Socket notification skipped.", err);
    }

    return {
      success: true,
      message: "Job offer cancelled successfully.",
    };
  } catch (error) {
    await session.abortTransaction();
    throw catchError(error);
  } finally {
    session.endSession();
  }
};

const findMyAcceptedJobListIntoDb = async (
  userId: string,
  query: Record<string, any>
) => {
  try {
    const cacheKey = `my_accepted_jobs_${userId}_${JSON.stringify(query)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const allAcceptedJobsQuery = new QueryBuilder(
      cleanerdistributions
        .find({
          userId,
          isDelete: false,
        })
        .populate([
          
          {
            path: "serviceId",
            match: {
              isAccepted: true,
              isDelete: false,
            },
            select:
              "addJobsPackages jobId selectedDate isAccepted isServiceStarted isServiceEed isAdvancePayment isCompletePayment totalAmount userId",
            populate: [
              {
                path: "jobId",
                select: "jobName jobType photo",
              },
              {
                path: "userId",
                select: "name photo email",
              },
            ],
          },
        ])
        .lean(),
      query
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    let data = await allAcceptedJobsQuery.modelQuery;

    data = data.filter((item: any) => item.serviceId);

    const meta = await allAcceptedJobsQuery.countTotal();

    const response = {
      meta,
      data,
    };

    cache.set(cacheKey, response);

    return response;
  } catch (error) {
    throw catchError(error);
  }
};

const cleanerCompletedJobGraphIntoDb = async (query: { year?: string }, userId: string) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Calculate start of current week (Monday) in UTC
    const startOfWeek = new Date(today);
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week (Sunday) in UTC
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const result = await cleanerdistributions.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDelete: false,
        },
      },
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
          "service.isDelete": false,
          "service.isAccepted": true,
          "service.isCompletePayment": true, // only count completed/fully paid jobs
          "service.selectedDate": {
            $gte: startOfWeek,
            $lte: endOfWeek,
          },
        },
      },
      {
        $project: {
          dayOfWeek: { $dayOfWeek: "$service.selectedDate" }, // 1 (Sunday) to 7 (Saturday)
          amount: "$service.totalAmount",
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyMap: Record<string, number> = {
      "Mon": 0,
      "Tue": 0,
      "Wed": 0,
      "Thu": 0,
      "Fri": 0,
      "Sat": 0,
      "Sun": 0,
    };

    result.forEach((item) => {
      const name = dayNames[item._id - 1];
      if (dailyMap[name] !== undefined) {
        dailyMap[name] = item.totalAmount;
      }
    });

    const graphData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      amount: dailyMap[day],
    }));

    return graphData;
  } catch (error) {
    throw catchError(error);
  }
};

const findMyAllRecentEarningIntoDb = async (
  query: Record<string, unknown>,
  userId: string
) => {
  try {
    const cacheKey = `my_recent_earning_${userId}_${JSON.stringify(query)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const recentEarningQuery = new QueryBuilder(
      cleanerdistributions
        .find({
          userId,
          isDelete: false,
        })
        .populate([
          {
            path: "serviceId",
            match: {
              isAccepted: true,
              isDelete: false,
            },
            select: "selectedDate isAccepted totalAmount jobId isCompletePayment",
            populate: [
              {
                path: "jobId",
                select: "jobName photo",
              },
              {
                path: "payment",
                match: {
                  payment_status: payment_status.paid,
                },
                select: "price payment_status createdAt",
              },
            ],
          },
        ])
        .lean(),
      query
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    let data = await recentEarningQuery.modelQuery;

    // remove null services
    data = data.filter((item: any) => item.serviceId);

    // only paid payment
    data = data.filter(
      (item: any) =>
        item.serviceId.payment &&
        item.serviceId.payment.payment_status === payment_status.paid
    );

    const meta = await recentEarningQuery.countTotal();

    const formattedData = data.map((item: any) => {
      const service = item.serviceId;
      const job = service.jobId || {};
      const payment = service.payment || {};
      
      // Format the date to a nice string (e.g. October 24, 2026)
      const formattedDate = service.selectedDate
        ? new Date(service.selectedDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : '';

      return {
        _id: item._id,
        title: job.jobName || 'Cleaning Service',
        photo: job.photo || '',
        date: formattedDate,
        amount: service.totalAmount || payment.price || 0,
        status: service.isCompletePayment ? 'COMPLETED' : 'ADVANCE_PAID',
      };
    });

    const response = {
      meta,
      data: formattedData,
    };

    cache.set(cacheKey, response);

    return response;
  } catch (error) {
    throw catchError(error);
  }
};

const findMyEarningSummaryIntoDb = async (userId: string) => {
  try {
    const cacheKey = `my_earning_summary_${userId}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await cleanerdistributions.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDelete: false,
        },
      },
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
          "service.isDelete": false,
          "service.isAccepted": true,
        },
      },
      {
        $group: {
          _id: null,
          totalCompletedJobs: {
            $sum: {
              $cond: [{ $eq: ["$service.isCompletePayment", true] }, 1, 0],
            },
          },
          totalAmount: {
            $sum: {
              $cond: [{ $eq: ["$service.isCompletePayment", true] }, "$service.totalAmount", 0],
            },
          },
          totalAdvancePayment: {
            $sum: {
              $cond: [
                { $eq: ["$service.isCompletePayment", false] },
                { $divide: ["$service.totalAmount", 2] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCompletedJobs: 1,
          totalAmount: 1,
          totalAdvancePayment: 1,
        },
      },
    ]);

    const response = result[0] || {
      totalCompletedJobs: 0,
      totalAmount: 0,
      totalAdvancePayment: 0,
    };

    cache.set(cacheKey, response);

    return response;
  } catch (error) {
    throw catchError(error);
  }
};



const cleanerDistributionService={
      isAcceptedJobOfferIntoDb,
      findByAllServicesIntoDb,
      deleteJobOfferIntoDb,
      findMyAcceptedJobListIntoDb,
      cleanerCompletedJobGraphIntoDb,
      findMyAllRecentEarningIntoDb,
      findMyEarningSummaryIntoDb
}

export default cleanerDistributionService