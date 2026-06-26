import { Schema, model } from "mongoose";
import { ServicesModel, TServices } from "./services.interface";


const AddJobsPackagesSchema = new Schema(
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
  { _id: true }
);


const AvailablePackagesServiceSchema = new Schema(
  {
    availablePackageId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "createjobs",
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const ServicesSchema = new Schema<TServices, ServicesModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
      required: true,
    },

    jobId: {
      type: Schema.Types.ObjectId,
      ref: "createjobs",
      index: true,
      required: true,
    },

    availablePackagesService: {
      type: [AvailablePackagesServiceSchema],
      required: false,
      index: true,
      default: [],
    },

    addJobsPackages: {
      type: [AddJobsPackagesSchema],
      required: false,
      index: true,
       default: [],
    },

    selectedDate: {
      type: Date,
      required: true,
    },

    isAccepted: {
      type: Boolean,
      required: false,
      index: true,
      default: false,
    },

    isServiceStarted: {
      type: Boolean,
      required: false,
      index: true,
      default: false,
    },

    isServiceEed: {
      type: Boolean,
      required: false,
      index: true,
      default: false,
    },

    isAdvancePayment: {
      type: Boolean,
      required: false,
      index: true,
      default: false,
    },

    isCompletePayment: {
      type: Boolean,
      required: false,
      index: true,
      default: false,
    },
    totalAmount:{

        type: Number,
        required: true , 
        default: 0.00

    },

    isDelete: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

ServicesSchema.virtual("payment", {
  ref: "payments",
  localField: "_id",
  foreignField: "serviceId",
  justOne: true,
});

ServicesSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

ServicesSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

ServicesSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});


ServicesSchema.statics.isServicesByCustomId = async function (id: string) {
  return await this.findById(id);
};

 const services = model<TServices, ServicesModel>(
  "services",
  ServicesSchema
);
export default services;

