import { Model } from "mongoose";

export interface TCategory {
  name: string;
  photo?: string;
}

export type CategoryModel = Model<TCategory, Record<string, never>>;
