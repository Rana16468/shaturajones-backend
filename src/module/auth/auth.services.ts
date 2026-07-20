import mongoose from "mongoose";
import { USER_ACCESSIBILITY } from "../user/user.constant";

import fs from "fs";
import users from "../user/user.model";
import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";
import { jwtHelpers } from "../../app/helper/jwtHelpers";
import config from "../../app/config";
import catchError from "../../app/error/catchError";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { user_search_filed } from "./auth.constant";
import { TUser } from "../user/user.interface";
import { cache } from "../createJobs/createJobs.constant";
import workprogress from "../workProgress/workProgress.model";
import messages from "../message/message.model";
import { Report } from "../report/report.model";
import deleteFileFromCloudinary from "../../utility/Cloudinary/deleteFileFromCloudinary";
import services from "../services/services.model";
import ratingreviews from "../ratingReview/ratingReview.model";
import payments from "../payment_gateway/payment_gateway.model";
import notifications from "../notification/notification.model";
import conversations from "../conversation/conversation.model";
import cleanerdistributions from "../cleanerDistribusation/cleanerDistribusation.model";






const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isUserExist = await users.findOne(
      {
        $and: [
          { email: payload.email },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      {
        password: 1,
        _id: 1,
        isVerify: 1,
        email: 1,
        role: 1,
        provider: 1,
      },

    ).lean();


    if (!isUserExist) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Invalid email or password",
        ""
      );
    }

    const isPasswordValid = await users.isPasswordMatched(
      payload.password,
      isUserExist.password
    );


    if (!isPasswordValid) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Invalid email or password",
        ""
      );
    }


    const jwtPayload = {
      id: isUserExist._id,
      role: isUserExist.role,
      email: isUserExist.email,
    } as any;

    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (isUserExist.isVerify) {
      try {
        accessToken = jwtHelpers.generateToken(
          jwtPayload,
          config.jwt_access_secret as string,
          config.expires_in as string
        );

        refreshToken = jwtHelpers.generateToken(
          jwtPayload,
          config.jwt_refresh_secret as string,
          config.refresh_expires_in as string
        );
      } catch (error: unknown) {
        catchError(error, "login section issues ,generate jwt issues");
      }
    }

    await session.commitTransaction();

    return {
      accessToken,
      refreshToken,
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ============== REFRESH TOKEN SERVICE ==============
const refreshTokenIntoDb = async (token: string) => {
  try {
    const decoded = jwtHelpers.verifyToken(
      token,
      config.jwt_refresh_secret as string
    );

    const { id } = decoded;
    const isUserExist = await users.findOne(
      {
        $and: [
          { _id: id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress }
        ],
      },
      { _id: 1, isVerify: 1, email: 1, role: 1 }
    );

    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    let accessToken: string | null = null;

    if (isUserExist.isVerify) {
      const jwtPayload = {
        id: isUserExist._id,
        role: isUserExist.role,
        email: isUserExist.email,
      } as any;

      try {
        accessToken = jwtHelpers.generateToken(
          jwtPayload,
          config.jwt_access_secret as string,
          config.expires_in as string
        );
      } catch (error: unknown) {
        catchError(error, "Token generation failed")
      }
    }

    return {
      accessToken,
    };
  } catch (error: unknown) {
    catchError(error, 'Invalid or expired refresh token');
  }
}; 

const myProfileIntoDb = async (id: string) => {
  try {
    const profile = await users
      .findById(id)
      .select("name country photo dateOfBirth phoneNumber createdAt updatedAt isAvailable skills cleaningExperience isValidate");

    if (!profile) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

   

    return profile
  } catch (error: unknown) {
    catchError(error, "Failed to fetch profile");
  }
};


const myAvatarIntoDb = async (
  id: string
): Promise<{ name: string; companyName?: string; photo?: string }> => {
  try {
    const profile = await users
      .findById(id)
      .select("name companyName photo")
      .lean();

    if (!profile) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    return profile;
  } catch (error: unknown) {
    throw catchError(error, "Failed to fetch profile");
  }
};

const changeMyProfileIntoDb = async (req: Response & {
    file?: Express.Multer.File
}, id: string) => {
  try {
    const file = req.file ;
    const body = req.body as any;

    const existingUser = await users.findById(id).select("photo");

    if (!existingUser) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    const updateData: Record<string, any> = {};

    // ✅ name
    if (body.name) {
      updateData.name = body.name.trim();
    }
    if (body.photo) {
      updateData.photo = body.photo.replace(/\\/g, "/");
    }

    if (file) {
      updateData.photo = file.path.replace(/\\/g, "/");

    
      if (existingUser.photo) {
        try {
          fs.unlinkSync(existingUser.photo);
        } catch (err) {
          console.log("Old photo delete failed:", err);
        }
      }
    }

    // ✅ location
    if (body.location) {
      updateData.location = body.location.trim();
    }

    // ✅ phone number
    if (body.phoneNumber) {
      updateData.phoneNumber = body.phoneNumber.trim();
    }

    // ✅ date of birth
    if (body.dateOfBirth) {
      updateData.dateOfBirth = body.dateOfBirth;
    }

    // ✅ country (FIXED: was countryOrigin before)
    if (body.country) {
      updateData.country = body.country.trim();
    }

    // 🔄 Update DB
    const result = await users.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Profile update failed",
        ""
      );
    }

    return {
      success: true,
      message: "Profile updated successfully",
      data: result,
    };
  } catch (error) {
    throw error;
  }
};

const findByAllUsersAdminIntoDb = async (
  query: Record<string, unknown>,
) => {
  try {
    const cacheKey = `admin_users_${JSON.stringify(query)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const allUsersQuery = new QueryBuilder(
      users
        .find({ isVerify: true })
        .select("-password -isDelete -verificationCode")
        .lean(),
      query
    )
      .search(user_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_admin_users = await allUsersQuery.modelQuery;
    const meta = await allUsersQuery.countTotal();

    const result = {
      meta,
      data: all_admin_users,
    };

    cache.set(cacheKey, result);

    return result;
  } catch (error: unknown) {
    throw catchError(error, "Failed to fetch all_admin_users");
  }
};


const deleteAccountIntoDb = async (
  userId: string,
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const cloudinaryUrls: string[] = [];

    const userDoc = await users.findById(userId).select("photo").session(session);
    if (!userDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }
    if (userDoc.photo) cloudinaryUrls.push(userDoc.photo);

    const progressDocs = await workprogress.find({
      $or: [{ cleanerId: userObjectId }, { customerId: userObjectId }]
    }).select("photo").session(session);
    
    progressDocs.forEach(doc => {
      if (doc.photo && Array.isArray(doc.photo)) {
        doc.photo.forEach(p => {
          if (p.photo) cloudinaryUrls.push(p.photo);
        });
      }
    });
    const messageDocs = await messages.find({ msgByUserId: userObjectId })
      .select("imageUrl audioUrl")
      .session(session);

    messageDocs.forEach(doc => {
      if (doc.imageUrl && Array.isArray(doc.imageUrl)) {
        cloudinaryUrls.push(...doc.imageUrl);
      }
      if (doc.audioUrl) {
        cloudinaryUrls.push(doc.audioUrl);
      }
    });
    const reportDocs = await Report.find({
      $or: [{ customerId: userObjectId }, { providerId: userObjectId }]
    }).select("images").session(session);

    reportDocs.forEach(doc => {
      if (doc.images && Array.isArray(doc.images)) {
        cloudinaryUrls.push(...doc.images);
      }
    });

    const uniqueUrls = [...new Set(cloudinaryUrls.filter(url => typeof url === 'string' && url.trim() !== ''))];
    
    if (uniqueUrls.length > 0) {
      try {
        await Promise.all(uniqueUrls.map(url => deleteFileFromCloudinary(url)));
      } catch (cloudinaryErr) {
        console.error("Cloudinary mass deletion error:", cloudinaryErr);
      }
    }

    // -----------------------------------------------------------------
    // 🔨 STEP 3: Database থেকে চিরতরে মুছে ফেলা (Hard Delete)
    // -----------------------------------------------------------------
    await services.deleteMany({ userId: userObjectId }, { session });
    await workprogress.deleteMany({ $or: [{ cleanerId: userObjectId }, { customerId: userObjectId }] }, { session });
    await Report.deleteMany({ $or: [{ customerId: userObjectId }, { providerId: userObjectId }] }, { session });
    await ratingreviews.deleteMany({ customerId: userObjectId }, { session });
    // await payments.deleteMany({ userId: userObjectId }, { session });
    await notifications.deleteMany({ userId: userObjectId }, { session });
    await messages.deleteMany({ msgByUserId: userObjectId }, { session });
    await conversations.deleteMany({ participants: userObjectId }, { session });
    await cleanerdistributions.deleteMany({ userId: userObjectId }, { session });
    
    await users.findByIdAndDelete(userId, { session });
    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: `Account, ${uniqueUrls.length} media files, and all associated records permanently deleted.`,
    };
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
    throw catchError(error);
  }
};

const isBlockAccountIntoDb = async (
  id: string,
  payload: Partial<TUser>,
  userRole: string
) => {
  try {
    if (userRole !== "admin") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Only administrators can block/unblock accounts",
        ""
      );
    }

  
    if (!payload.status) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Status is required",
        ""
      );
    }

    
    const validStatuses = [
      USER_ACCESSIBILITY.isProgress,
      USER_ACCESSIBILITY.blocked,
    ] as const;


    if (!validStatuses.includes(payload.status as any)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid status value",
        ""
      );
    }

    const result = await users.findByIdAndUpdate(
      id,
      { status: payload.status },
      { new: true, runValidators: true }
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    return {
      success: true,
      message: `User account ${payload.status} successfully`,
      data: result,
    };
  } catch (error: unknown) {
    return catchError(error, "Block account operation failed");
  }
};



const deleteAdminIntoDb = async (id: string) => {


  try {
    const result = await users.findByIdAndDelete(id);
    if (!result) {
      throw new ApiError(httpStatus.NOT_EXTENDED, ' issues by the delete admin section', '')
    };

    return {
      status: true,
      message: "successfully delete"
    }

  }
  catch (error) {
    catchError(error);
  }
}


const AuthServices = {
  loginUserIntoDb,
  refreshTokenIntoDb,
   myProfileIntoDb,
  changeMyProfileIntoDb,
  findByAllUsersAdminIntoDb,
  deleteAccountIntoDb,
  isBlockAccountIntoDb,
  deleteAdminIntoDb,
   myAvatarIntoDb

};

export default AuthServices;