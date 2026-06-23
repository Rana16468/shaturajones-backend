import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import createjobs from "../createJobs/createJobs.model";
import services from "./services.model";
import { TServices } from "./services.interface";

const createNewJobsServicesIntoDb = async (
  userId: string,
  payload: TServices
): Promise<{ success: boolean; message: string }> => {
  try {
    const {
      jobId,
      availablePackagesService = [],
      addJobsPackages = [],
    } = payload;

    // 1. Check job exists
    const job = await createjobs.findById(jobId);

    if (!job) {
      throw new ApiError(httpStatus.NOT_FOUND, "Job not found", "");
    }

    // 2. Prevent duplicate service
    const isServiceExist = await services.exists({ jobId });

    if (isServiceExist) {
      return {
        success: false,
        message: "Service already exists for this job",
      };
    }

    // 3. Validate available packages
    const validPackageIds = new Set(
      job.availablePackages.map((pkg: any) => pkg._id.toString())
    );

    const invalidPackages = availablePackagesService.filter(
      (pkg) => !validPackageIds.has(pkg.availablePackageId)
    );

    if (invalidPackages.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid package selection: ${invalidPackages
          .map((p) => p.availablePackageId)
          .join(", ")}`,
        ""
      );
    }

    // 4. REMOVE isDelete:true PACKAGES (IMPORTANT FIX)
    const cleanedAddJobsPackages = addJobsPackages
      .filter((pkg) => pkg.isDelete !== true)
      .map((pkg) => ({
        jobName: pkg.jobName?.trim(),
        price: Number(pkg.price),
        isDelete: false,
      }));

    // 5. Final DB insert
    const newService = await services.create({
      ...payload,
      userId,
      availablePackagesService,
      addJobsPackages: cleanedAddJobsPackages,
    });

    if (!newService) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to create service",
        ""
      );
    }

    return {
      success: true,
      message: "Service created successfully",
    };
  } catch (error) {
    throw catchError(error);
  }
};

const JobsServices = {
  createNewJobsServicesIntoDb,
};

export default JobsServices;