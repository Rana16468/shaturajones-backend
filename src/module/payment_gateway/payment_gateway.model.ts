import mongoose, { Schema, model } from "mongoose";

import { payment_method, payment_status } from "./payment_gateway.constant";
import { PaymentGateWayModel, TStripePaymentGateWay } from "./payment_gateway.interface";

const TStripePaymentGateWaySchema = new Schema<
  TStripePaymentGateWay,
  PaymentGateWayModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: [true, "userId is required"],
    },
    
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "services",
      required: [true, "services is required"],
    },
    price: {
      type: Number,
      required: [true, "price is required"],
    },
    description: {
      type: String,
      required: [false, "description is required"],
    },
    currency: {
      type: String,
      required: [false, "currency is not required "],
    },
    sessionId: {
      type: String,
      required: [false, "session is not  required"],
     
    },
    paymentmethod: {
      type: String,
      enum: {
        values: [payment_method.cash, payment_method.card],
        message: "{VALUE} is not a valid provider",
      },
      index: true,
      required: [false, "payment method is not Required"],
      default: payment_method.card,
    },
    payment_status: {
      type: String,
     
      enum: {
        values: [payment_status.unpaid, payment_status.paid],
        message: "{VALUE} is not a valid provider",
      },
      index: true,
      required: [false, "payment status is not  required"],
      default: payment_status.unpaid,
    },
    payable_name: {
      type: String,
      required: [false, "payable name is not required"],
    },
    payable_email: {
      type: String,
      required: [false, "payable email is not required"],
    },
    payment_intent: {
      type: String,
      required: [false, "payment intent is not required"],
    },
    country: {
      type: String,
      index: true,
      required: [false, "country is not required"],
    },

    isDelete: {
      type: Boolean,
      required: [false, "isDelete not requirted"],
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
  }
);

// midlewere
TStripePaymentGateWaySchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TStripePaymentGateWaySchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TStripePaymentGateWaySchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

// Static method
TStripePaymentGateWaySchema.statics.isPaymentGateWayExistByCustomId =
  async function (id: string) {
    return this.findOne({ _id: id });
  };
const payments = model<TStripePaymentGateWay, PaymentGateWayModel>(
  "payments",
  TStripePaymentGateWaySchema
);

export default payments;