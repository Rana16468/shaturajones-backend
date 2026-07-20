import { Model, Types } from "mongoose";

export type TReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "REJECTED";

export type TReport = {
  customerId: Types.ObjectId;
  providerId: Types.ObjectId;
  serviceId?: Types.ObjectId;
  reportType: string;
  description: string;
  images?: string[];
  status: TReportStatus;
  adminResponse?: string;
  isActionTaken?: boolean;
  isDelete?: boolean;
};

export interface ReportModel extends Model<TReport> {}
