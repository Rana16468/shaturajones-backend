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

const isAcceptedJobOfferIntoDb = async (
    userId: string,
    payload: TCleanerDistribution
) => {
    try {

        // Prevent duplicate acceptance by same cleaner
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

        // Atomic update
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

    const sortBy = (query.sortBy as string) || "createdAt";
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
          as: "serviceId",
        },
      },
      {
        $unwind: "$serviceId",
      },

      {
        $match: {
          "serviceId.isAdvancePayment": true,
          "serviceId.isAccepted": false,
          "serviceId.isDelete": {
            $ne: true,
          },
        },
      },

      // User
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $unwind: "$userId",
      },

      {
        $project: {
          currency: 1,
          payment_status: 1,
      
          serviceId: {
            _id: "$serviceId._id",
            jobId: "$serviceId.jobId",
            selectedDate: "$serviceId.selectedDate",
            isAccepted: "$serviceId.isAccepted",
            isAdvancePayment: "$serviceId.isAdvancePayment",
            isCompletePayment: "$serviceId.isCompletePayment",
            isServiceStarted: "$serviceId.isServiceStarted",
            isServiceEed: "$serviceId.isServiceEed",
            totalAmount: "$serviceId.totalAmount",
          },
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

const cleanerDistributionService={
      isAcceptedJobOfferIntoDb,
      findByAllServicesIntoDb
}

export default cleanerDistributionService