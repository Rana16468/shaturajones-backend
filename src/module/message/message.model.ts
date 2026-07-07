import mongoose, { model, Schema } from 'mongoose';
import { IMessage } from './message.interface';
import { boolean } from 'zod';



const messageSchema = new Schema<IMessage>(
  {
    text: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: [String],
      default: [],
    },
    audioUrl: {
     type: String,
     required: false,
     default: "",
    },
    seen: {
      type: Boolean,
      index:true,
      default: false,
    },
    msgByUserId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      index:true,
      ref: 'users',
    },
    conversationId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      index:true,
      ref: 'conversations',
    },
      isDelete:{
        type: Boolean,
        required: false,
        default: false

      }
  },
  {
    timestamps: true,
    versionKey:false
  },
);


messageSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

messageSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

messageSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

const messages = model<IMessage>('messages', messageSchema);

export default messages;
