import httpStatus from "http-status";
import ApiError from "../app/error/ApiError";
import users from "../module/user/user.model";

/**
 * Automatically deletes unverified users older than 10 minutes.
 * @returns {Promise<Object>}
 */
const auto_delete_unverified_user = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime.getTime() - 10 * 60 * 1000);

    const deleteResult = await users.deleteMany({
      isVerify: false,
      isDelete: false,
      createdAt: { $lt: timeThreshold },
    });

    if (deleteResult.deletedCount === 0) {
      return { 
        success: true,
        deletedCount: 0, 
        message: 'No unverified users found to delete' 
      };
    }

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `${deleteResult.deletedCount} unverified users deleted successfully`,
    };

  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Issue occurred within the unverified user deletion cron job',
      error?.message || error
    );
  }
};

export default auto_delete_unverified_user;