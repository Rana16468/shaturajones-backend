import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import UserServices from './user.services';
import sendResponse from '../../utility/sendRespone';
import httpStatus from 'http-status';



const updateFcmToken: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.updateFcmTokenIntoDb(req.user.id, req.body.fcmToken);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully updated FCM token',
    data: result,
  });
});

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.createUserIntoDb(req.body);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Change Onboarding Status',
    data: result,
  });
});

const userVerification: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.userVerificationIntoDb(
    req.body.verificationCode
  );
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Varified Your Account",
    data: result,
  });
});




const changePassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.changePasswordIntoDb(req.body, req.user.id);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Change Password",
    data: result,
  });
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.forgotPasswordIntoDb(req.body);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Send Email",
    data: result,
  });
});

const verificationForgotUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.verificationForgotUserIntoDb(req.body);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Verify User",
    data: result,
  });
});

const resetPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.resetPasswordIntoDb(req.body);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Reset Password",
    data: result,
  });
});



const getUserGrowth: RequestHandler = catchAsync(async (req, res) => {

  const result = await UserServices.getUserGrowthIntoDb(req.query);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Find User Growth",
    data: result,
  });

});


const resendVerificationOtp:RequestHandler=catchAsync(async(req , res)=>{

     const result=await UserServices.resendVerificationOtpIntoDb(req.params.email);
     sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Successfully  Resend Verification OTP",
      data: result,
  });
});


const  createAdminAccount:RequestHandler=catchAsync(async(req , res)=>{

    const  result=await UserServices.createAdminAccountIntoDb(req.body);
         sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: result?.message as string,
      data: result,
  });
});


const userOverView:RequestHandler=catchAsync(async(req , res)=>{


    const result=await UserServices.userOverViewIntoDb(req.user.id);
     sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "successfully find by overview",
      data: result,
  });

});



const updateCareerOverview:RequestHandler=catchAsync(async(req , res)=>{

    const result=await UserServices.updateCareerOverviewIntoDb(req.user.id, req.body);
     sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "successfully Update Overview",
      data: result,
  });
});


const buildCleanerProfile: RequestHandler=catchAsync(async(req , res)=>{

    const result=await UserServices.buildCleanerProfileIntoDb(req.user.id, req.body);
     sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "successfully build Profile",
      data: result,
  });
})

const toggleAvailability: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.toggleAvailabilityInDb(req.user.id, req.body.isAvailable);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Availability toggled successfully",
    data: result,
  });
});

const UserController = {
  createUser,
  userVerification,
  changePassword,
  forgotPassword,
  verificationForgotUser,
  resetPassword,
  getUserGrowth,
  resendVerificationOtp,
  createAdminAccount,
  userOverView,
  updateCareerOverview,
  buildCleanerProfile,
  toggleAvailability,
  updateFcmToken
};

export default UserController;
