import { Schema, model } from "mongoose";
import { Photos, TWorkProgress, WorkProgressModel } from "./workProgress.interface";


const PhotoSchema = new Schema<Photos>(
  {
    photo: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: true, 
    versionKey: false,
  }
);


const WorkProgressSchema = new Schema<TWorkProgress, WorkProgressModel>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "services",
      required: true,
      index: true,
    },
    cleanerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
      customerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    jobId: {
      type: Schema.Types.ObjectId,
      ref: "createjobs",
      required: true,
      index: true,
    },

    photo: {
      type: [PhotoSchema],
      default: [],
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

WorkProgressSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

WorkProgressSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

WorkProgressSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});



WorkProgressSchema.statics.isWorkProgressByCustomId = async function (
  id: string
) {
  return await this.findById(id);
};

const workprogress = model<TWorkProgress, WorkProgressModel>(
  "workprogress",
  WorkProgressSchema
);

export default workprogress;