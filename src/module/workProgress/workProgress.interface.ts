import { Model, Types } from "mongoose";

export type Photos ={
photo: string;

}

export interface TWorkProgress {
    serviceId: Types.ObjectId;
    cleanerId: Types.ObjectId;
    customerId: Types.ObjectId;
    jobId: Types.ObjectId;
    photo: Photos[];
    isDelete: boolean;
};

export interface WorkProgressModel extends Model<TWorkProgress> {

  isWorkProgressByCustomId(id: string): Promise<TWorkProgress>;
}