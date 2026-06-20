import express, { NextFunction, Request, Response } from "express";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../utility/uplodeFile";
import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import validationRequest from "../../middleware/validationRequest";
import createJobValidation from "./createJobs.validations";
import CreateJobController from "./createJobs.controller";

const router = express.Router();

router.post(
  "/create_jobs",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),

 
  upload.single("photo"),

  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data) {
        req.body = JSON.parse(req.body.data);
      }

      // ✅ attach file path to body
      if (req.file) {
        req.body.photo = req.file.path; // or req.file.filename
      }

      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON data", ""));
    }
  },

  validationRequest(createJobValidation.createJobsZodSchema),
  CreateJobController.createJob
);

const CreateJobsRouter=router

export default CreateJobsRouter;