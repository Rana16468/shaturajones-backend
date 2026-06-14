import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken'
import mongoose from 'mongoose';
import crypto from "crypto";
import bcrypt from 'bcrypt';
import users from './user.model';
import fs from "fs";
import path from "path";
import { TUser } from './user.interface';
import ApiError from '../../app/error/ApiError';
import sendEmail from '../../utility/sendEmail';
import catchError from '../../app/error/catchError';
import { jwtHelpers } from '../../app/helper/jwtHelpers';
import config from '../../app/config';
import { USER_ACCESSIBILITY } from './user.constant';
import emailContext from '../../utility/emailcontext/sendvarificationData';




 const generateOTP = (): { otp: string; hash: string } => {
  const otp = crypto.randomInt(100000, 1000000).toString();

  const hash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
    return { otp, hash };
};

const createUserIntoDb = async (payload: TUser) => {
  try {
    const isExistUser = await users.findOne({
      email: payload.email,
      isVerify: true,
    });

    if (isExistUser) {
      throw new ApiError(httpStatus.CONFLICT, "Email already exists", "");
    }

    // 1. generate OTP
    const { otp, hash } = generateOTP();

    // 2. prepare user
    payload.isVerify = false;
    payload.verificationCode = hash;

    const user = new users(payload);
    await user.save();

    // 3. send email (FIXED)

    console.log({

      name:  payload.name, 
      otp,

    })

   // 3. send email
    await sendEmail(
      payload.email,
      "User Verification Email",
      emailContext.sendVerificationData(
        payload.email,
        Number(otp),
        "User Verification Email"
      )
    );

    return {
      status: true,
      message: "Account created successfully. OTP sent to email.",
    };
  } catch (error) {
    throw catchError(error, "Create user failed");
  }
};


const  userVerificationIntoDb = async (verificationCode: string) => {

  
  try{
     if (!verificationCode) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Verification code is required", ""
    );
  }

  const hashedCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");

  const user = await users.findOneAndUpdate({
    verificationCode: hashedCode
    
  },{isVerify:true},{new:true , upsert:true});

  if (!user) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired verification code", ""
    );
  }

  // One-time use


  const jwtPayload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  };
  
  

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.expires_in as string
  );

  return {
    message: "User verification successful",
    accessToken,
  };

  }
  catch(error:unknown){

     catchError(error, 'server error by the user Verification Int oDb section ')

  }
};

const changePasswordIntoDb = async (
  payload: {
    oldPassword: string;
    newPassword: string;
  },
  userId: string,
) => {
  try {
   
    const user = await users
      .findOne(
        {
          _id: userId,
          isVerify: true,
          status: USER_ACCESSIBILITY.isProgress,
        },
        { password: 1 },
      )
      .lean();

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', "");
    }
 
    const isOldPasswordValid = await users.isPasswordMatched(
      payload.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Old password does not match', ""
      );
    }
    const isSamePassword = await bcrypt.compare(
      payload.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'New password must be different from old password', ""
      );
    }

  



    const hashedPassword = await bcrypt.hash(
      payload.newPassword,
      Number(config.bcrypt_salt_rounds),
    );
    console.log("hashedPassword", hashedPassword)

    const updated = await users.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        createdAt: new Date(), 
      },
      { new: true }, 
    );

    if (!updated) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to update password', ""
      );
    }




    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (error: unknown) {

    catchError(error, 'Password change failed');
    
  }
};

// forgot password

const forgotPasswordIntoDb = async (payload: string | { email: string }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let emailString: string;

    if (typeof payload === 'string') {
      emailString = payload;
    } else if (payload && typeof payload === 'object' && 'email' in payload) {
      emailString = payload.email;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format', '');
    }

    const isExistUser = await users.findOne(
      {
        $and: [
          { email: emailString },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1, provider: 1, password:1 },
      { session },
    );

    if (!isExistUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    };


      const { otp, hash } = generateOTP();

    

    const result = await users.findOneAndUpdate(
      { _id: isExistUser._id },
      { verificationCode:  hash },
      {
        new: true,
        upsert: true,
        projection: { _id: 1, email: 1 },
        session,
      },
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OTP forgot section issues', '');
    }

    try {
      

  await sendEmail(
     emailString,
      "User Verification Email",
      emailContext.sendVerificationData(
        emailString,
        Number(otp),
        "User Verification Email"
      )
    );

    } catch (emailError: unknown) {
      await session.abortTransaction();
      session.endSession();
      catchError(emailError,'Failed to send verification email');

      
    }

    await session.commitTransaction();
    session.endSession();

    return { status: true, message: 'Checked Your Email' };
  } catch (error: any) {
  await session.abortTransaction();
  session.endSession();


  catchError(error, 'server error by the forgot Password Into Db section ')
}

};



const verificationForgotUserIntoDb = async (
  payload: { verificationCode: string }
): Promise<string> => {
  try{

    const { verificationCode } = payload;

  if (!verificationCode) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP is required", "");
  }

  const hashedCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");

  const user = await users.findOne(
    {
      verificationCode: hashedCode,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress,
    },
    {
      _id: 1,
      email: 1,
      role: 1,
       updatedAt:1
    
    }
  ) as any;

        if(user && user?.password && user?.provider?.includes('googleAuth')){
     throw new ApiError(
      httpStatus.FORBIDDEN,
      "Social login users cannot reset password using OTP", ""
    );
  };

  if (!user) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired OTP",
      ""
    );
  };

  const updatedAt =
       user.updatedAt instanceof Date
        ?  user.updatedAt.getTime()
        : new Date( user.updatedAt).getTime();

    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (now - updatedAt > FIVE_MINUTES) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'OTP has expired. Please request a new one.',
        '',
      );
    }

  const jwtPayload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.expires_in as string
  );

  await users.updateOne(
    { _id: user._id },
    {
      $unset: {
        verificationCode: "",
        verificationCodeExpiresAt: "",
      },
    }
  );

  return accessToken;

  }
  catch(error:unknown){
   if (error instanceof ApiError) {
      throw error; 
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Verification service temporarily unavailable",
      ""
    );
  }
};



const resetPasswordIntoDb = async (payload: {
  token: string;
  password: string;
}) => {
  try {


     const decoded = jwt.verify(
              payload.token,
              config.jwt_access_secret as string,
            ) as JwtPayload;
    const isExistUser = await users.findOne(
      {
        $and: [
          { _id: decoded.id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1 },
    );
    if (!isExistUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'some issues by the  reset password section',
        '',
      );
    }
    payload.password = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    );

    const result = await users.findByIdAndUpdate(
      isExistUser._id,
      { password: payload.password },
      { new: true, upsert: true },
    );
    return result && { status: true, message: 'successfylly reset password' };
  } catch (error: unknown) {
      
    catchError(error, 'server unavailable  reset password into db function')
  }
};





const getUserGrowthIntoDb = async (query: { year?: string }) => {
  try {
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();
    const previousYear = year - 1;

    // Get current year stats
    const currentYearStats = await users.aggregate([
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
                year: year,
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

    // Get previous year total count
    const previousYearStats = await users.aggregate([
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

    // Calculate year-over-year growth percentage
    let yearlyGrowth = 0;
    if (previousYearTotal > 0) {
      yearlyGrowth = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
    } else if (currentYearTotal > 0) {
      yearlyGrowth = 100; // If no users in previous year but users exist in current year
    }

    // Extract monthly stats
    const monthlyStats = currentYearStats[0]?.months || [];

    return {
      monthlyStats,
      yearlyGrowth: parseFloat(yearlyGrowth.toFixed(2)),
      year,
    };
  } catch (error) {
  catchError(error, 'server error by the get user growth into db section '  );
    
  }
};


const resendVerificationOtpIntoDb = async (email: string) => {
  try{
     if (!email) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Email is required",""
    );
  }

  // 1️⃣ Find user
  const user = await users.findOne(
    {
      email,
      isVerify:true,
      status: USER_ACCESSIBILITY.isProgress,
    },
    { _id: 1, isVerify: 1, password:1, provider:1 }
  );

  if (!user) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "This user does not exist in our database", ""
    );
  }


  if (user.isVerify) {
    return {
      status: false,
      message: "This user is already verified",
    };
  }

  const { otp, hash } = generateOTP();
  await users.updateOne(
    { _id: user._id },
    {
      verificationCode: hash,
    },
    {upsert:true}
  );

  

 

  return {
    status: true,
    message: "Verification OTP sent successfully",
  };

  }
  catch(error: unknown){

    catchError(error, 'server error by the  resend Verification Otp Into Db section ')
    

  }
};

const createAdminAccountIntoDb=async(payload: Partial<TUser>)=>{


  try{

    console.log('payload', payload);


     const isExistAdmin = await users.findOne(
      {
        email: payload.email,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1 }
    );



    if (isExistAdmin ) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "This email already exists",
        ""
      );
    }
  
    payload.isVerify = true;
    const otp = generateOTP();
   payload.verificationCode=otp.hash ;




    const user = new users({ ...payload });
    await user.save();


    if(!user){
      throw new ApiError(httpStatus.NOT_EXTENDED, 'issues by the admin  create section', '');
    };


    return {
      status:true , 
      message:"successfully create a account"
    }

   

  }
  catch(error){
    catchError(error);
  }

};


const userOverViewIntoDb=async(userId: string)=>{

   try{

    const result=await users.findById(userId).select("-status -role -verifyIdentity.isVerified -verificationCode -isVerify -WorkPreferences.availableFrom -WorkPreferences.willingToRelocate -WorkPreferences.willingToTravel -WorkPreferences.remoteAcceptable");
    return result;

   }
   catch(error){
      catchError(error);
   }
};


const deleteFileIfExists = (filePath?: string) => {
  if (!filePath) return;

  const fullPath = path.join(process.cwd(), filePath);

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.warn("Failed to delete file:", err);
    }
  }
};

const updateCareerOverviewIntoDb = async (
  userId: string,
  payload: Partial<TUser>
) => {
  try {
    if (!userId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID', '');
    }

    const existing = await users.findById(userId).lean();

    if (!existing) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    const updateData: any = {};

    // -------------------------
    // Basic Info
    // -------------------------
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.email) updateData.email = payload.email.trim();
    if (payload.phoneNumber) updateData.phoneNumber = payload.phoneNumber;
    if (payload.dateOfBirth) updateData.dateOfBirth = payload.dateOfBirth;
    if (payload.country) updateData.country = payload.country;
    if (payload.location) updateData.location = payload.location;

    // -------------------------
    // Photo (with cleanup)
    // -------------------------
    if (payload.photo) {
      updateData.photo = payload.photo;

      if (existing.photo) {
        deleteFileIfExists(existing.photo);
      }
    }

  
    const result = await users.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Profile update failed',
        '',
      );
    }

    return {
      status: true,
      message: 'Career overview updated successfully'
     
    };
  } catch (error) {
    throw catchError(error);
  }
};

const buildCleanerProfileIntoDb = async (userId: string, payload: any) => {
  try {
    if (!userId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID", "");
    }

    const existing = await users.findById(userId).lean();

    if (!existing) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    console.log(payload)

    const updateData: any = {};

    updateData.photo = payload.photo;

   
    
      updateData.nationalId=payload.verifyIdentity.nationalId
    


    updateData.cleaningExperience =
      payload.cleaningExperience?.trim();

    updateData.skills =
      payload.skills?.map((s: string) => s.trim()) || [];

    const result = await users.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Profile update failed",
        ""
      );
    }

    return {
      status: true,
      message: "Cleaner profile updated successfully",
      data: result,
    };
  } catch (error) {
    throw catchError(error);
  }
};



const UserServices = {
  createUserIntoDb,
   userVerificationIntoDb,
  resendVerificationOtpIntoDb,
  getUserGrowthIntoDb,
  resetPasswordIntoDb,
  verificationForgotUserIntoDb,
  changePasswordIntoDb,
  forgotPasswordIntoDb,
  createAdminAccountIntoDb,
  userOverViewIntoDb,
  updateCareerOverviewIntoDb,
  buildCleanerProfileIntoDb





};
export default UserServices;