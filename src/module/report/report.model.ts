import { Schema, model } from "mongoose";
import { ReportModel, TReport } from "./report.interface";
import "../createJobs/createJobs.model";
import "../services/services.model";
import "../user/user.model";

const reportSchema = new Schema<TReport, ReportModel>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "services",
      required: false,
    },
    reportType: {
      type: String,
      required: [true, "Report type is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["PENDING", "REVIEWED", "RESOLVED", "REJECTED"],
      default: "PENDING",
    },
    adminResponse: {
      type: String,
      default: "",
    },
    isActionTaken: {
      type: Boolean,
      default: false,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

reportSchema.pre("findOne", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

reportSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

export const Report = model<TReport, ReportModel>("reports", reportSchema);
