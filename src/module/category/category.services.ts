import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { TCategory } from "./category.interface";
import { Category } from "./category.model";
import createjobs from "../createJobs/createJobs.model";

const createCategoryIntoDb = async (payload: TCategory): Promise<TCategory> => {
  try {
    const isExist = await Category.findOne({ name: payload.name.trim() });
    if (isExist) {
      throw new ApiError(httpStatus.CONFLICT, "Category already exists", "");
    }
    const result = await Category.create({
      ...payload,
      name: payload.name.trim(),
    });
    return result;
  } catch (error) {
    throw catchError(error);
  }
};

const getAllCategoriesFromDb = async (): Promise<TCategory[]> => {
  try {
    return await Category.find({}).sort({ name: 1 });
  } catch (error) {
    throw catchError(error);
  }
};

const deleteCategoryFromDb = async (id: string) => {
  try {
    const isJobExist = await createjobs.findOne({
      category: id,
      isDelete: { $ne: true },
    });

    if (isJobExist) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot delete category: Jobs/Services are associated with this category. Please delete the associated jobs first.",
        ""
      );
    }

    const result = await Category.findByIdAndDelete(id);
    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "Category not found", "");
    }
    return result;
  } catch (error) {
    throw catchError(error);
  }
};

const CategoryServices = {
  createCategoryIntoDb,
  getAllCategoriesFromDb,
  deleteCategoryFromDb,
};

export default CategoryServices;
