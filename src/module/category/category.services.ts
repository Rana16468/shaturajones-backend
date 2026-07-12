import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { TCategory } from "./category.interface";
import { Category } from "./category.model";

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

const CategoryServices = {
  createCategoryIntoDb,
  getAllCategoriesFromDb,
};

export default CategoryServices;
