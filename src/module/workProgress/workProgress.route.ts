import express, { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

import auth from "../../middleware/auth";
import validationRequest from "../../middleware/validationRequest";
import upload from "../../utility/uplodeFile";
import ApiError from "../../app/error/ApiError";

import { USER_ROLE } from "../user/user.constant";
import WorkProgressValidation from "./workProgress.validation";
import WorkingProgressController from "./workProgress.controller";

const router = express.Router();

router.post(
  "/before_working",
  auth(USER_ROLE.cleaner),
  upload.fields([
    {
      name: "photo",
      maxCount: 10,
    },
  ]),

  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.photo?.length) {
        req.body.photo = files.photo.map((file) => ({
          photo: file.path.replace(/\\/g, "/"),
        }));
      }

      next();
    } catch (error) {
      next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "Invalid request data", ""
        )
      );
    }
  },

  validationRequest(
    WorkProgressValidation.createWorkProgressValidationSchema
  ),

  WorkingProgressController.beforeWorking
);

router.post(
  "/after_working",
  auth(USER_ROLE.cleaner),
  upload.fields([
    {
      name: "photo",
      maxCount: 10,
    },
  ]),

  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.photo?.length) {
        req.body.photo = files.photo.map((file) => ({
          photo: file.path.replace(/\\/g, "/"),
        }));
      }

      next();
    } catch (error) {
      next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "Invalid request data", ""
        )
      );
    }
  },

  validationRequest(
    WorkProgressValidation.createWorkProgressValidationSchema
  ),

  WorkingProgressController.afterWorking
);

export default router;