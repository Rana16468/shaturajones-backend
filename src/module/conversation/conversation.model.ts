
import { model, Schema } from 'mongoose';
import { IConversation } from './conversation.interface';




const conversationSchema = new Schema<IConversation>(
  {
    serviceId: {
      type:Schema.Types.ObjectId,
      required:[false,'eventId is required'],
      ref:"services",
      index:true
    },
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'users',
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'messages',
      default: null
    },
   
    isDelete:{
      type: Boolean,
      required:[false,'isDelete is not required'],
      default:false
    }
  },
  {
    timestamps: true,
  },
);


conversationSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

conversationSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

conversationSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});


const conversations = model<IConversation>('conversations', conversationSchema);

export default conversations;