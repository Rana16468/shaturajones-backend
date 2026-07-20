import express, { NextFunction, Request, Response } from "express";




import httpStatus from "http-status";
import validationRequest from "../../middleware/validationRequest";
import LoginValidationSchema from "./auth.validation";
import AuthController from "./auth.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../utility/uplodeFile";
import ApiError from "../../app/error/ApiError";
import UserValidationSchema from "../user/user.validation";





const router = express.Router();

router.post(
  "/login_user",
  validationRequest(LoginValidationSchema.LoginSchema),
  AuthController.loginUser
);

router.post(
  "/refresh-token",
  validationRequest(LoginValidationSchema.requestTokenValidationSchema),
  AuthController.refreshToken
);

router.get(
  "/myprofile",
  auth(
    USER_ROLE.cleaner,
    USER_ROLE.superAdmin,
    USER_ROLE.admin,
    USER_ROLE.customer
  ),
  AuthController.myProfile
);

// Routes file
router.patch(
  "/update_my_profile",
  auth(
    USER_ROLE.cleaner,
    USER_ROLE.superAdmin,
    USER_ROLE.admin,
    USER_ROLE.customer
  ),

  upload.fields([{ name: "photo", maxCount: 1 }]),

  (req: Request, _res: Response, next: NextFunction) => {
    try {
    
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

    
      const photo = files?.photo?.[0];

      if (photo) {
        req.body.photo = photo.path.replace(/\\/g, "/");
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, "Invalid request data", error));
    }
  },

  validationRequest(UserValidationSchema.UpdateUserProfileSchema),
  AuthController.changeMyProfile
);
router.get(
  "/find_by_admin_all_users",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AuthController.findByAllUsersAdmin
);


router.patch(
  "/change_status/:id",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validationRequest(LoginValidationSchema.changeUserAccountStatus),
  AuthController.isBlockAccount
);


//router.delete("/delete_account/:id", auth(USER_ROLE.admin,USER_ROLE.cleaner, USER_ROLE.customer, USER_ROLE.superAdmin), AuthController.deleteAdmin)

router.get("/find_my_avatar", auth(USER_ROLE.admin,USER_ROLE.customer, USER_ROLE.cleaner, USER_ROLE.superAdmin),AuthController.myAvatar)


const AuthRouter = router;
export default AuthRouter;