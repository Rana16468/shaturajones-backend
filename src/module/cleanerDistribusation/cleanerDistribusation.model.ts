import { Schema, model } from "mongoose";
import { CleanerDistributionModel, TCleanerDistribution } from "./cleanerDistribusation.interface";


const CleanerDistributionSchema = new Schema<
  TCleanerDistribution,
  CleanerDistributionModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref:"users",
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref:"services",
      required: true,
      index: true,
    },
    isReview: {
      type: Boolean,
      index: true,
      default: false,
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

// midlewere
CleanerDistributionSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

CleanerDistributionSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

CleanerDistributionSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});


CleanerDistributionSchema.statics.cleanerDistributionExistByCustomId =
  async function (id: string) {
    return await this.findById(id);
  };

 const cleanerdistributions = model<
  TCleanerDistribution,
  CleanerDistributionModel
>("cleanerdistributions", CleanerDistributionSchema);
export default cleanerdistributions;

