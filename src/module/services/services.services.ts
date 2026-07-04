import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import createjobs from "../createJobs/createJobs.model";
import services from "./services.model";
import { TServices } from "./services.interface";
import { cache } from "../createJobs/createJobs.constant";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { boolean } from "zod";

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

    // 3. Build map of available packages (id -> price)
    const packageMap = new Map<string, number>();

    job.availablePackages.forEach((pkg: any) => {
      packageMap.set(pkg._id.toString(), pkg.price);
    });

    
    let packageTotal = 0;

    for (const pkg of availablePackagesService) {
      const price = packageMap.get(pkg.availablePackageId.toString());

      if (!price) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid package selected: ${pkg.availablePackageId}`,
          ""
        );
      }

      packageTotal += price;
    }

    // 5. Calculate addJobsPackages total (ignore isDelete:true)
    const cleanedAddJobsPackages = addJobsPackages.filter(
      (pkg) => pkg.isDelete !== true
    );

    const addOnTotal = cleanedAddJobsPackages.reduce((sum, pkg) => {
      return sum + Number(pkg.price || 0);
    }, 0);

    // 6. FINAL TOTAL
    const totalAmount = packageTotal + addOnTotal;

    // 7. Create service
    const newService = await services.create({
      ...payload,
      userId,
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

    return {
      success: true,
      message: `Service created successfully. Total: ${totalAmount}`,
    };
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
        .select(
          "-jobId -userId -selectedDate -isAdvancePayment -isCompletePayment"
        )
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

    const result = {
      meta,
      data,
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



const JobsServices = {
  createNewJobsServicesIntoDb,
   findMyAllServicesIntoDb,
   deleteJobsServicesIntoDb

};

export default JobsServices;