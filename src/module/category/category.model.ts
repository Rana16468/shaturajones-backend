import { Schema, model } from "mongoose";
import { TCategory, CategoryModel } from "./category.interface";

const categorySchema = new Schema<TCategory, CategoryModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    photo: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Category = model<TCategory, CategoryModel>("Category", categorySchema);
