import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import CategoryServices from "./category.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";

const createCategory: RequestHandler = catchAsync(async (req, res) => {
  const result = await CategoryServices.createCategoryIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Successfully created Category",
    data: result,
  });
});

const getAllCategories: RequestHandler = catchAsync(async (req, res) => {
  const result = await CategoryServices.getAllCategoriesFromDb();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully retrieved Categories",
    data: result,
  });
});

const CategoryController = {
  createCategory,
  getAllCategories,
};

export default CategoryController;
