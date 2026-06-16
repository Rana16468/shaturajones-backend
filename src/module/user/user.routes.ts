import express, { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';
import validationRequest from '../../middleware/validationRequest';
import UserValidationSchema from './user.validation';
import UserController from './user.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from './user.constant';
import upload from '../../utility/uplodeFile';
import ApiError from '../../app/error/ApiError';

const router = express.Router();

router.post(
  "/create_user",
  validationRequest(UserValidationSchema.createUserZodSchema),

  UserController.createUser
);


router.patch(
  "/user_verification",
  validationRequest(UserValidationSchema.UserVerification),
  UserController.userVerification
);

router.patch(
  "/change_password",
  auth(
    USER_ROLE.admin,
    USER_ROLE.superAdmin,
    USER_ROLE.cleaner,
    USER_ROLE.customer
   
  ),
  validationRequest(UserValidationSchema.ChangePasswordSchema),
  UserController.changePassword
);

router.post(
  "/forgot_password",
  validationRequest(UserValidationSchema.ForgotPasswordSchema),
  UserController.forgotPassword
);

router.post(
  "/verification_forgot_user",
  validationRequest(UserValidationSchema.verificationCodeSchema),
  UserController.verificationForgotUser
);





router.post(
  "/reset_password",
  validationRequest(UserValidationSchema.resetPasswordSchema),
  UserController.resetPassword
);
router.get("/find_by_user_growth", 
  auth(USER_ROLE.admin, USER_ROLE.superAdmin,),
   UserController.getUserGrowth);
router.get("/resend_verification_otp/:email",UserController.resendVerificationOtp);








router.post("/create_new_admin", 
  validationRequest(UserValidationSchema.createUserZodSchema),
   UserController.createAdminAccount);



router.patch(
  "/update_profile",
  upload.fields([
    { name: "photo", maxCount: 1 },
    
  ]),

  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === "string") {
        const parsedData = JSON.parse(req.body.data);
        req.body = { ...parsedData, ...req.body };
        delete req.body.data;
      }
      next();
    } catch {
      next(new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON data", ""));
    }
  },


  auth(USER_ROLE.cleaner, USER_ROLE.customer),


  validationRequest(UserValidationSchema.UpdateUserProfileSchema),


  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = (req.files || {}) as Record<string, Express.Multer.File[]>;

     

    

      const attachPath = (file: Express.Multer.File) =>
        file.path.replace(/\\/g, "/");

      // Single files
      if (files.photo?.[0]) {
        req.body.photo = attachPath(files.photo[0]);
      }


      next();
    } catch (error) {
      next(error);
    }
  },

  UserController.updateCareerOverview
);

router.patch(
  "/build_cleaner_profile",
  auth(USER_ROLE.cleaner, USER_ROLE.customer),

  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "nationalId", maxCount: 1 },
  ]),

  validationRequest(UserValidationSchema.buildCleanerProfile),

  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = (req.files || {}) as Record<string, Express.Multer.File[]>;

      const attachPath = (file: Express.Multer.File) =>
        file.path.replace(/\\/g, "/");

      // ensure object exists
      if (!req.body.verifyIdentity) {
        req.body.verifyIdentity = {};
      }

      // photo
      if (files.photo?.[0]) {
        req.body.photo = attachPath(files.photo[0]);
      }

      // nationalId (keep consistent structure)
      if (files.nationalId?.[0]) {
        req.body.verifyIdentity.nationalId = attachPath(
          files.nationalId[0]
        );
      }

      if (req.body.data) {
        try {
          const parsed =
            typeof req.body.data === "string"
              ? JSON.parse(req.body.data)
              : req.body.data;

          req.body = {
            ...parsed,
            ...req.body,
          };
        } catch (err) {
          return next(new Error("Invalid JSON in data field"));
        }
      }

    
      next();
    } catch (error) {
      next(error);
    }
  },

  UserController.buildCleanerProfile
);




const UserRouters = router;
export default UserRouters;