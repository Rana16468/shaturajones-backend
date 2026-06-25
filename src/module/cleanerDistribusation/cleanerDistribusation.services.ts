import catchError from "../../app/error/catchError";
import { cache } from "../createJobs/createJobs.constant";
import { payment_status } from "../payment_gateway/payment_gateway.constant";
import payments from "../payment_gateway/payment_gateway.model";

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
  findByAllServicesIntoDb
}

export default cleanerDistributionService;