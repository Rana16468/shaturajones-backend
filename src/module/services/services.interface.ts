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
export type AddOnsService ={
    addOnsId: Types.ObjectId;
    isDelete: boolean;
}

export interface TServices {

    userId: Types.ObjectId;
    jobId: Types.ObjectId;
    availablePackagesService?:AvailablePackagesService[]
    addOnsService?:AddOnsService[]
    addJobsPackages?: AddJobsPackages[]
    selectedDate: Date;
    isAccepted: boolean;
    isServiceStarted: boolean;
    isServiceEed: boolean;
    isAdvancePayment: boolean;
    isCompletePayment: boolean;
    isCompletionRequested?: boolean;
    isExtensionRequested?: boolean;
    extensionDuration?: string;
    totalAmount: number;
    stripeCustomerId?: string;
    stripePaymentMethodId?: string;
    cleanerPayout?: number;
    adminCommission?: number;
    cleaningType?: string;
    duration?: number;
    specialInstructions?: string;
    location?: string;
    isDelete: boolean;
}

export interface ServicesModel extends Model<TServices> {

  isServicesByCustomId(id: string): Promise<TServices>;
}