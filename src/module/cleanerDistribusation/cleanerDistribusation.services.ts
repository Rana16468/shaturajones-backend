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
              "addJobsPackages jobId selectedDate isAccepted isServiceStarted isServiceEed isAdvancePayment isCompletePayment totalAmount",
            populate: {
              path: "jobId",
              select: "title category address",
            },
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

const cleanerCompletedJobGraphIntoDb=async(query: { year?: string })=>{
  try{

     const year = query.year ? parseInt(query.year) : new Date().getFullYear();
    
        const cacheKey = `user_growth_${year}`;
    
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          return cachedData;
        }
    
        const previousYear = year - 1;
    
        const currentYearStats = await cleanerdistributions.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                $lte: new Date(`${year}-12-31T23:59:59.999Z`),
              },
            },
          },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              month: "$_id.month",
              count: 1,
              _id: 0,
            },
          },
          {
            $group: {
              _id: null,
              totalCount: { $sum: "$count" },
              data: { $push: { month: "$month", count: "$count" } },
            },
          },
          {
            $project: {
              totalCount: 1,
              months: {
                $map: {
                  input: { $range: [1, 13] },
                  as: "m",
                  in: {
                    year,
                    month: "$$m",
                    count: {
                      $let: {
                        vars: {
                          matched: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$data",
                                  as: "d",
                                  cond: { $eq: ["$$d.month", "$$m"] },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: { $ifNull: ["$$matched.count", 0] },
                      },
                    },
                  },
                },
              },
            },
          },
        ]);
    
        const previousYearStats = await cleanerdistributions.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(`${previousYear}-01-01T00:00:00.000Z`),
                $lte: new Date(`${previousYear}-12-31T23:59:59.999Z`),
              },
            },
          },
          {
            $count: "totalCount",
          },
        ]);
    
        const currentYearTotal = currentYearStats[0]?.totalCount || 0;
        const previousYearTotal = previousYearStats[0]?.totalCount || 0;
    
        let yearlyGrowth = 0;
    
        if (previousYearTotal > 0) {
          yearlyGrowth =
            ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
        } else if (currentYearTotal > 0) {
          yearlyGrowth = 100;
        }
    
        const result = {
          monthlyStats: currentYearStats[0]?.months || [],
          yearlyGrowth: Number(yearlyGrowth.toFixed(2)),
          year,
        };
    
       
        cache.set(cacheKey, result);
    
        return result;

  }
   catch (error) {
    throw catchError(error);
  }

}

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
            select:
              "  selectedDate isAccepted",
            populate: [
             
              {
                path: "payment",
                match: {
                  payment_status: payment_status.paid,
                },
                select:
                  "price  payment_status  createdAt",
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
        $lookup: {
          from: "payments",
          let: {
            serviceId: "$service._id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$serviceId", "$$serviceId"],
                    },
                    {
                      $eq: [
                        "$payment_status",
                        payment_status.paid,
                      ],
                    },
                    {
                      $eq: ["$isDelete", false],
                    },
                  ],
                },
              },
            },
          ],
          as: "payments",
        },
      },
      {
        $match: {
          payments: {
            $ne: [],
          },
        },
      },

      {
        $group: {
          _id: null,

          totalCompletedJobs: {
            $sum: 1,
          },

          totalAmount: {
            $sum: "$service.totalAmount",
          },

          totalAdvancePayment: {
            $sum: {
              $arrayElemAt: ["$payments.price", 0],
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