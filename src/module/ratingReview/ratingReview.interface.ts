import { Model, Types } from "mongoose";


export interface IRatingReview {
  serviceId: Types.ObjectId;
  customerId: Types.ObjectId;
  rating: number;
  review: string;
  isDelete?: boolean;
 
}

export interface RatingReviewModel extends Model<IRatingReview> {
  // eslint-disable-next-line no-unused-vars
  RatingReviewExistByCustomId(id: string): Promise<IRatingReview>;
}