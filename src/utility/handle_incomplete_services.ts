
import catchError from "../app/error/catchError";
import services from "../module/services/services.model";

const handle_incomplete_services = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime.getTime() - 30 * 60 * 1000);

    const deleteResult = await services.deleteMany({
      isAdvancePayment: false,
      isCompletePayment: false,
      createdAt: { $lt: timeThreshold },
    });

    if (deleteResult.deletedCount === 0) {
      const noResultsLog = {
        success: true,
        deletedCount: 0,
        message: "No unpaid payments found older than 30 minutes",
      };
      
      console.log(noResultsLog);
      return noResultsLog;
    }
    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `${deleteResult.deletedCount} unpaid payments deleted successfully`,
    };

  } catch (error) {
    throw catchError(error);
  }
};

export default handle_incomplete_services;