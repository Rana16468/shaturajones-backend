import { Schema, model } from "mongoose";
import { IRatingReview, RatingReviewModel } from "./ratingReview.interface";


const RatingReviewSchema = new Schema<IRatingReview, RatingReviewModel>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "services",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    review: {
      type: String,
      required: false,
     default: null,
      trim: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

RatingReviewSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

RatingReviewSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

RatingReviewSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});




RatingReviewSchema.statics.RatingReviewExistByCustomId = async function (
  id: string
) {
  return await this.findById(id);
};

const ratingreviews = model<IRatingReview, RatingReviewModel>(
  "ratingreviews",
  RatingReviewSchema
);

export default ratingreviews;