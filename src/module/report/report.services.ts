import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { Report } from "./report.model";
import { TReport } from "./report.interface";
import User from "../user/user.model";
import notifications from "../notification/notification.model";
import { supportEmailModel } from "../settings/settings.modal";

const createReportInDb = async (payload: Partial<TReport>) => {
  try {
    const result = await Report.create(payload);
    return result;
  } catch (error) {
    catchError(error);
  }
};

const getMyReportsFromDb = async (customerId: string) => {
  try {
    const reports = await Report.find({ customerId })
      .populate({
        path: "providerId",
        select: "name email photo phoneNumber status",
      })
      .populate({
        path: "serviceId",
        select: "totalAmount selectedDate cleaningType location",
        populate: {
          path: "jobId",
          select: "jobName photo jobType category price",
        },
      })
      .sort({ createdAt: -1 });

    return reports;
  } catch (error) {
    catchError(error);
  }
};

const getAdminReportsFromDb = async (query: Record<string, unknown>) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = (query.search as string) || "";
    const status = (query.status as string) || "";

    const filterQuery: Record<string, unknown> = { isDelete: { $ne: true } };
    if (status) {
      filterQuery.status = status;
    }

    let reports = await Report.find(filterQuery)
      .populate({
        path: "customerId",
        select: "name email photo phoneNumber",
      })
      .populate({
        path: "providerId",
        select: "name email photo phoneNumber status",
      })
      .populate({
        path: "serviceId",
        select: "totalAmount selectedDate cleaningType location",
        populate: {
          path: "jobId",
          select: "jobName photo jobType category price",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (search) {
      const searchRegex = new RegExp(search, "i");
      reports = reports.filter((r: any) => {
        const customerName = r.customerId?.name || "";
        const customerEmail = r.customerId?.email || "";
        const providerName = r.providerId?.name || "";
        const providerEmail = r.providerId?.email || "";
        const reportType = r.reportType || "";
        const description = r.description || "";

        return (
          searchRegex.test(customerName) ||
          searchRegex.test(customerEmail) ||
          searchRegex.test(providerName) ||
          searchRegex.test(providerEmail) ||
          searchRegex.test(reportType) ||
          searchRegex.test(description)
        );
      });
    }

    const total = await Report.countDocuments(filterQuery);

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      reports,
    };
  } catch (error) {
    catchError(error);
  }
};

const respondToReportInDb = async (
  reportId: string,
  payload: { adminResponse: string; status?: string },
) => {
  try {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new ApiError(httpStatus.NOT_FOUND, "Report not found", "");
    }

    report.adminResponse = payload.adminResponse;
    report.status = (payload.status as any) || "RESOLVED";
    await report.save();

    return report;
  } catch (error) {
    catchError(error);
  }
};

const blockProviderFromReportInDb = async (reportId: string) => {
  try {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new ApiError(httpStatus.NOT_FOUND, "Report not found", "");
    }

    const providerId = report.providerId;
    const provider = await User.findById(providerId);
    if (!provider) {
      throw new ApiError(httpStatus.NOT_FOUND, "Provider not found", "");
    }

    // Update provider status to Blocked
    provider.status = "Blocked";
    await provider.save();

    // Get Support email
    const supportConfig = await supportEmailModel.findOne();
    const supportEmail = supportConfig?.supportEmail || "support@shaturajones.com";

    // Create notification for provider
    await notifications.create({
      title: "Account Banned",
      message: `Your account has been banned due to a customer report violation. If you believe this is an error, please contact support at: ${supportEmail}`,
      userId: providerId,
    });

    // Update report status
    report.isActionTaken = true;
    report.status = "RESOLVED";
    if (!report.adminResponse) {
      report.adminResponse = `Provider has been blocked. Support email: ${supportEmail}`;
    }
    await report.save();

    return {
      report,
      supportEmail,
    };
  } catch (error) {
    catchError(error);
  }
};

const ReportServices = {
  createReportInDb,
  getMyReportsFromDb,
  getAdminReportsFromDb,
  respondToReportInDb,
  blockProviderFromReportInDb,
};

export default ReportServices;
