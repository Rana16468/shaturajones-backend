import express, { NextFunction, Request, Response } from "express";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../utility/uplodeFile";
import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import CategoryController from "./category.controller";

const router = express.Router();

router.post(
  "/create_category",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single("photo"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data) {
        req.body = JSON.parse(req.body.data);
      }
      if (req.file) {
        req.body.photo = req.file.path.replace(/\\/g, "/");
      }
      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON data", ""));
    }
  },
  CategoryController.createCategory
);

router.get(
  "/get_all_categories",
  auth(
    USER_ROLE.customer,
    USER_ROLE.cleaner,
    USER_ROLE.admin,
    USER_ROLE.superAdmin
  ),
  CategoryController.getAllCategories
);

router.delete(
  "/delete_category/:id",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  CategoryController.deleteCategory
);

export const CategoryRouter = router;
