import { Model, Types } from "mongoose";

export type AvailablePackages = {
    jobName: string,
    price: number,
    isDelete?: boolean
}
export type AddOns= {
    jobName: string,
    price: number,
    isDelete?: boolean
}
export interface TCreateJobs {

    jobName: string,
    photo: string,
    jobType: "CLEANING",
    category: Types.ObjectId | string;
    cleaningType?: "general" | "deep";
    duration?: number;
    isDelete?: boolean;
    rating?: number;
    description?: string;
    availablePackages:AvailablePackages[]
    addOns:AddOns[]
}

export interface CreateJobsModel extends Model<TCreateJobs> {

  isTCreateJobsByCustomId(id: string): Promise<TCreateJobs>;
}