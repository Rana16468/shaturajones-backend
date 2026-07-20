import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { TCategory } from "./category.interface";
import { Category } from "./category.model";
import { sendFileToCloudinary } from "../../utility/Cloudinary/sendFileToCloudinary";

const createCategoryIntoDb = async (payload: TCategory): Promise<TCategory> => {
  try {
    const isExist = await Category.findOne({ name: payload.name.trim() });
    if (isExist) {
      throw new ApiError(httpStatus.CONFLICT, "Category already exists", "");
    }
    const finalPayload = { 
      ...payload,
      name: payload.name.trim() 
    };


    if (payload.photo && typeof payload.photo === 'string') {
      const fileName = `${Date.now()}-category-photo`;

      const uploaded = await sendFileToCloudinary(fileName, payload.photo);
      
      
      finalPayload.photo = uploaded.secure_url;
    }

    const result = await Category.create(finalPayload);
    return result;
    
  } catch (error) {
    throw catchError(error);
  }
};;

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
