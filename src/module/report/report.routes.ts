import express, { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import auth from "../../middleware/auth";
import upload from "../../utility/uplodeFile";
import ApiError from "../../app/error/ApiError";
import { USER_ROLE } from "../user/user.constant";
import ReportController from "./report.controller";

const router = express.Router();

router.post(
  "/create_report",
  auth(USER_ROLE.customer),
  upload.fields([
    {
      name: "photo",
      maxCount: 5,
    },
  ]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        const parsed = JSON.parse(req.body.data);
        req.body = { ...req.body, ...parsed };
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.photo?.length) {
        req.body.images = files.photo.map((file) =>
          file.path.replace(/\\/g, "/"),
        );
      }

      next();
    } catch (error) {
      next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "Invalid request data for report creation",
          "",
        ),
      );
    }
  },
  ReportController.createReport,
);

router.get(
  "/my_reports",
  auth(USER_ROLE.customer),
  ReportController.getMyReports,
);

router.get(
  "/admin/all_reports",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportController.getAdminReports,
);

router.patch(
  "/admin/respond/:id",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportController.respondToReport,
);

router.post(
  "/admin/block_provider/:id",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportController.blockProviderFromReport,
);

export default router;
