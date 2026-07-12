import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import createjobs from "../createJobs/createJobs.model";
import services from "./services.model";
import { TServices } from "./services.interface";
import { cache } from "../createJobs/createJobs.constant";
import QueryBuilder from "../../app/builder/QueryBuilder";
import cleanerdistributions from "../cleanerDistribusation/cleanerDistribusation.model";


const createNewJobsServicesIntoDb = async (
  userId: string,
  payload: TServices
): Promise<any> => {
  try {
    const {
      jobId,
      availablePackagesService = [],
      addOnsService = [],
      addJobsPackages = [],
    } = payload;

    // Find Job
    const job = await createjobs.findById(jobId);

    if (!job) {
      throw new ApiError(httpStatus.NOT_FOUND, "Job not found", "");
    }

    // Prevent duplicate service
    const isServiceExist = await services.exists({
      jobId,
      userId,
      isDelete: { $ne: true },
    });

    if (isServiceExist) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Service already exists for this job",
        ""
      );
    }

    /**
     * ------------------------------------------
     * Build Available Package Price Map
     * ------------------------------------------
     */
    const packageMap = new Map<string, number>();

    job.availablePackages.forEach((pkg: any) => {
      if (!pkg.isDelete) {
        packageMap.set(pkg._id.toString(), Number(pkg.price));
      }
    });

    /**
     * ------------------------------------------
     * Build AddOns Price Map
     * ------------------------------------------
     */
    const addOnsMap = new Map<string, number>();

    job.addOns.forEach((addon: any) => {
      if (!addon.isDelete) {
        addOnsMap.set(addon._id.toString(), Number(addon.price));
      }
    });

    /**
     * ------------------------------------------
     * Calculate Available Packages Total
     * ------------------------------------------
     */
    let packageTotal = 0;

    for (const item of availablePackagesService) {
      if (item.isDelete) continue;

      const price = packageMap.get(item.availablePackageId.toString());

      if (price === undefined) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid available package selected: ${item.availablePackageId}`,
          ""
        );
      }

      packageTotal += price;
    }

    /**
     * ------------------------------------------
     * Calculate AddOns Total
     * ------------------------------------------
     */
    let addOnsTotal = 0;

    for (const item of addOnsService) {
      if (item.isDelete) continue;

      const price = addOnsMap.get(item.addOnsId.toString());

      if (price === undefined) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid add-on selected: ${item.addOnsId}`,
          ""
        );
      }

      addOnsTotal += price;
    }

    /**
     * ------------------------------------------
     * Calculate Custom Job Packages Total
     * ------------------------------------------
     */
    const cleanedAddJobsPackages = addJobsPackages.filter(
      (pkg) => !pkg.isDelete
    );

    const customPackageTotal = cleanedAddJobsPackages.reduce((sum, pkg) => {
      return sum + Number(pkg.price || 0);
    }, 0);

    /**
     * ------------------------------------------
     * Final Total
     * ------------------------------------------
     */
    const totalAmount =
      packageTotal +
      addOnsTotal +
      customPackageTotal;

    /**
     * ------------------------------------------
     * Create Service
     * ------------------------------------------
     */
    const newService = await services.create({
      ...payload,
      userId,
      availablePackagesService,
      addOnsService,
      addJobsPackages: cleanedAddJobsPackages,
      totalAmount,
    });

    if (!newService) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to create service",
        ""
      );
    }

    return newService;
  } catch (error) {
    throw catchError(error);
  }
};

const findMyAllServicesIntoDb = async (
  userId: string,
  query: Record<string, unknown>
) => {
  try {
    const cacheKey = `services_${userId}_${JSON.stringify(query)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const { status } = query;

    const baseFilter: Record<string, any> = {
      userId,
      isDelete: { $ne: true },
    };

    switch (status) {
      case "accepted":
        baseFilter.isAccepted = true;
        baseFilter.isServiceStarted = false;
        baseFilter.isServiceEed = false;
        break;

      case "started":
        baseFilter.isAccepted = true;
        baseFilter.isServiceStarted = true;
        baseFilter.isServiceEed = false;
        break;

      case "completed":
        baseFilter.isAccepted = true;
        baseFilter.isServiceStarted = true;
        baseFilter.isServiceEed = true;
        break;

      case "pending":
        baseFilter.isAccepted = false;
        break;

      case "all":
      default:
       
        break;
    }



    const modifiedQuery = { ...query };
    delete modifiedQuery.status;

    const servicesQuery = new QueryBuilder(
      services
        .find(baseFilter)
        .populate("jobId")
        .lean(),
      modifiedQuery
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await servicesQuery.modelQuery;
    const meta = await servicesQuery.countTotal();

    const dataWithCleaner = await Promise.all(
      data.map(async (service: any) => {
        const distribution = await cleanerdistributions
          .findOne({ serviceId: service._id })
          .populate("userId", "name photo email phoneNumber")
          .lean();
        if (distribution && distribution.userId) {
          service.cleanerId = distribution.userId;
        }
        return service;
      })
    );

    const result = {
      meta,
      data: dataWithCleaner,
    };

    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    throw catchError(error);
  }
};

const  deleteJobsServicesIntoDb=async(id: string):Promise<{
    success: boolean,
    message: string
}>=>{


     try{
        const isExistJobs=await services.exists({_id: id, isAccepted: true });
 if(isExistJobs){

    return {
        success: false,
            message:"your jobs already accepted,  you can not delete"
    }
    
 }

        const result=await services.findByIdAndDelete(id);

        if(!result){
            throw new ApiError(httpStatus.NOT_EXTENDED, 'issues by the delete jobs services', "");
        }
        return{
            success: true,
            message:"successfully delete"
        }

     }
catch (error) {
    throw catchError(error);
  }
};

const findBySpecificServiceIntoDb = async (id: string) => {
  try {
    const cacheKey = `service_${id}`;

    const cachedService = cache.get(cacheKey);

    if (cachedService) {
      return cachedService;
    }
    const service = await services.findById(id).populate("jobId").lean() as any;

    if (!service) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Service not found",
        ""
      );
    }

    const distribution = await cleanerdistributions
      .findOne({ serviceId: id })
      .populate("userId", "name photo email phoneNumber")
      .lean();

    if (distribution && distribution.userId) {
      service.cleanerId = distribution.userId;
    }

    cache.set(cacheKey, service);

    return service;
  } catch (error) {
    throw catchError(error);
  }
};



const JobsServices = {
  createNewJobsServicesIntoDb,
   findMyAllServicesIntoDb,
   deleteJobsServicesIntoDb,
   findBySpecificServiceIntoDb

};

export default JobsServices;