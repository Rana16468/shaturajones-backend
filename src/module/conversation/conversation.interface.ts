import { Types } from 'mongoose';


export interface IConversation {
  serviceId:Types.ObjectId
  participants: [Types.ObjectId];
  lastMessage: Types.ObjectId | null;
  isDelete?:Boolean
}
