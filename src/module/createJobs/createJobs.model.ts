import { Schema, model } from "mongoose";
import { CreateJobsModel, TCreateJobs } from "./createJobs.interface";


const availablePackageSchema = new Schema(
  {
    jobName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },

    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const createJobsSchema = new Schema<TCreateJobs, CreateJobsModel>(
  {
    jobName: {
      type: String,
      required: true,
    },
    jobType: {
      type: String,
      enum: ["CLEANING"],
      required: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    photo:{

        type: String,
        required: true
    },
    rating: {
      type: Number,
      default: 0,
    },
    availablePackages: {
      type: [availablePackageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

createJobsSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

createJobsSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

createJobsSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

createJobsSchema.statics.isTCreateJobsByCustomId = async function (
  id: string
) {
  return this.findById(id);
};

 const createjobs = model<TCreateJobs, CreateJobsModel>(
  "createjobs",
  createJobsSchema
);
export default createjobs