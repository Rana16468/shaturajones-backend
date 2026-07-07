import { Types } from 'mongoose';

export interface IMessage {
  text: string;
  imageUrl: string[];
  audioUrl: string;
  seen: boolean;
  msgByUserId: Types.ObjectId;
  conversationId: Types.ObjectId;
    isDelete?:boolean
}

export interface NewMessagePayload {
  receiverId: string;
  serviceId:string;
  text: string;
  imageUrl?: string[];
  audioUrl?: string;
  isDelete?:boolean

}

export interface MulterRequest extends Request {
  files?: Express.Multer.File[]; 
  file?: Express.Multer.File;   
}