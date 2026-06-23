import httpStatus from "http-status";
import payments from "../module/payment_gateway/payment_gateway.model";
import { payment_status } from "../module/payment_gateway/payment_gateway.constant";
import ApiError from "../app/error/ApiError";

/**
 * Deletes unpaid payments older than 30 minutes.
 * @returns {Promise<Object>}
 */
const handle_unpaid_payment = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime.getTime() - 30 * 60 * 1000);

    const deleteResult = await payments.deleteMany({
      payment_status: payment_status.unpaid,
      createdAt: { $lt: timeThreshold },
    });

    if (deleteResult.deletedCount === 0) {
      const noResultsResponse = {
        success: true,
        deletedCount: 0,
        message: "No unpaid payments found older than 30 minutes",
      };

      console.log(noResultsResponse);
      return noResultsResponse;
    }

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `${deleteResult.deletedCount} unpaid payments deleted successfully`,
    };
    
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Issue occurred while deleting unpaid payments",
      error?.message || error
    );
  }
};

export default handle_unpaid_payment;