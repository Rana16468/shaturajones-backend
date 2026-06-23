import { Schema, model, Model, Types } from "mongoose";
import { NotificationModel, TNotification } from "./notification.interface";





const notificationSchema = new Schema<TNotification, NotificationModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users", 
        required: true,
        index:true
  
    },
       isRead:{
      type:Boolean,
      required: false ,
      index:true, 
      default: false
      
    }, 
    route:{
      type: String, 
      required: false ,
      default: null

    }, 
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);


notificationSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

notificationSchema.pre("findOne", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

notificationSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});






// static method
notificationSchema.statics.notificationCustomId = async function (id: string) {
  return this.findById(id);
};

 const notifications = model<TNotification, NotificationModel>(
  "notifications",
  notificationSchema
);

export default  notifications;    