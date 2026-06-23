import { Model, Types } from "mongoose";

export type AddJobsPackages = {
    jobName: string,
    price: number,
    isDelete?: boolean
}

export type AvailablePackagesService ={
    availablePackageId: Types.ObjectId;
    isDelete: boolean;

}

export interface TServices {

    userId: Types.ObjectId;
    jobId: Types.ObjectId;
    availablePackagesService?:AvailablePackagesService[]
    addJobsPackages?: AddJobsPackages[]
    selectedDate: Date;
    isAccepted: boolean;
    isServiceStarted: boolean;
    isServiceEed: boolean;
    isAdvancePayment: boolean;
    isCompletePayment: boolean;
    totalAmount: number;
    isDelete: boolean;
}

export interface ServicesModel extends Model<TServices> {

  isServicesByCustomId(id: string): Promise<TServices>;
}