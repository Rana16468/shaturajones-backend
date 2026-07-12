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

      if (req.file) {
        req.body.photo = req.file.path.replace(/\\/g, "/"); // or req.file.filename
      }
  

      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON data", ""));
    }
  },

  validationRequest(createJobValidation.createJobsZodSchema),
  CreateJobController.createJob
);

router.get("/find_by_all_jobs", auth(USER_ROLE.customer, USER_ROLE.cleaner, USER_ROLE.admin, USER_ROLE.superAdmin), CreateJobController.findByAllJobs);
router.get("/find_by_specific_jobs/:id", auth(USER_ROLE.admin, USER_ROLE.customer, USER_ROLE.cleaner, USER_ROLE.superAdmin), CreateJobController.findBySpecificJobs);

router.patch(
  "/update_jobs/:id",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),

 
  upload.single("photo"),

  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data) {
        req.body = JSON.parse(req.body.data);
      }

      if (req.file) {
      }
  

      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON data", ""));
    }
  },

  validationRequest(createJobValidation.updateCreateJobsZodSchema),
  CreateJobController.updateJobs
);

router.delete("/delete_jobs/:id", auth(USER_ROLE.admin, USER_ROLE.superAdmin), CreateJobController.deleteJobs);

const CreateJobsRouter=router

export default CreateJobsRouter;