import { RequestHandler } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utility/catchAsync";
import sendRespone from "../../utility/sendRespone";
import ReportServices from "./report.services";

const createReport: RequestHandler = catchAsync(async (req, res) => {
  const customerId = (req as any).user?.id || (req as any).user?._id;
  const payload = {
    ...req.body,
    customerId,
  };

  const result = await ReportServices.createReportInDb(payload);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Report submitted successfully",
    data: result,
  });
});

const getMyReports: RequestHandler = catchAsync(async (req, res) => {
  const customerId = (req as any).user?.id || (req as any).user?._id;
  const result = await ReportServices.getMyReportsFromDb(customerId);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Reports fetched successfully",
    data: result,
  });
});

const getAdminReports: RequestHandler = catchAsync(async (req, res) => {
  const result = await ReportServices.getAdminReportsFromDb(req.query);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Admin reports fetched successfully",
    data: result,
  });
});

const respondToReport: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ReportServices.respondToReportInDb(id, req.body);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Response sent to customer successfully",
    data: result,
  });
});

const blockProviderFromReport: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ReportServices.blockProviderFromReportInDb(id);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Provider blocked and notification sent successfully",
    data: result,
  });
});

const ReportController = {
  createReport,
  getMyReports,
  getAdminReports,
  respondToReport,
  blockProviderFromReport,
};

export default ReportController;
