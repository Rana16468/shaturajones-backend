import { Model, Types } from "mongoose";

export interface TCleanerDistribution {

      userId: Types.ObjectId,
      serviceId: Types.ObjectId, 
      isReview: boolean;
      isDelete: boolean;

}

export interface CleanerDistributionModel extends Model<TCleanerDistribution> {
  // eslint-disable-next-line no-unused-vars
  cleanerDistributionExistByCustomId(id: string): Promise<TCleanerDistribution>;
}