import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import createjobs from "../createJobs/createJobs.model";
import services from "./services.model";
import { TServices } from "./services.interface";
import { cache } from "../createJobs/createJobs.constant";
import QueryBuilder from "../../app/builder/QueryBuilder";
import cleanerdistributions from "../cleanerDistribusation/cleanerDistribusation.model";
import workprogress from "../workProgress/workProgress.model";
import Stripe from "stripe";
import config from "../../app/config";
import payments from "../payment_gateway/payment_gateway.model";
import users from "../user/user.model";

const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string
);


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
     * Final Total & Payout Splits
     * ------------------------------------------
     */
    const totalAmount =
      packageTotal +
      addOnsTotal +
      customPackageTotal;

    // Calculate cleaner payout based on job type and duration
    const cleaningType = (job as any).cleaningType || "general";
    const duration = Number((job as any).duration || 0);
    const hourlyRate = cleaningType === "deep" ? 30 : 25;
    const cleanerPayout = duration * hourlyRate;
    const adminCommission = Math.max(0, totalAmount - cleanerPayout);

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
      cleanerPayout,
      adminCommission,
      cleaningType,
      duration,
    });

    if (!newService) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to create service",
        ""
      );
    }

    cache.flushAll();
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
        cache.flushAll();
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
    const service = await services.findById(id).populate(["jobId", "userId"]).lean() as any;

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

const extendDeadlineIntoDb = async (
  payload: { serviceId: string; extensionDuration: string },
  userId: string
) => {
  try {
    const service = await services.findById(payload.serviceId);
    if (!service) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found", "");
    }
    
    // Set extension properties
    service.isExtensionRequested = true;
    service.extensionDuration = payload.extensionDuration;
    await service.save();

    cache.flushAll();
    return service;
  } catch (error) {
    throw catchError(error);
  }
};

const acceptExtensionIntoDb = async (
  serviceId: string,
  accept: boolean,
  userId: string,
  newDeadline?: string
) => {
  try {
    const service = await services.findById(serviceId);
    if (!service) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found", "");
    }

    if (accept) {
      if (newDeadline) {
        service.selectedDate = new Date(newDeadline);
      } else {
        let hoursToAdd = 0;
        if (service.extensionDuration) {
          const duration = service.extensionDuration.toLowerCase();
          if (duration.includes("1 hour")) hoursToAdd = 1;
          else if (duration.includes("2 hours")) hoursToAdd = 2;
          else if (duration.includes("4 hours")) hoursToAdd = 4;
          else if (duration.includes("1 day")) hoursToAdd = 24;
          else if (duration.includes("2 days")) hoursToAdd = 48;
        }

        if (hoursToAdd > 0 && service.selectedDate) {
          const currentDt = new Date(service.selectedDate);
          currentDt.setHours(currentDt.getHours() + hoursToAdd);
          service.selectedDate = currentDt;
        }
      }
    }

    // Reset extension properties
    service.isExtensionRequested = false;
    service.extensionDuration = "";
    await service.save();

    cache.flushAll();
    return service;
  } catch (error) {
    throw catchError(error);
  }
};

const requestCompletionIntoDb = async (
  payload: { serviceId: string },
  userId: string
) => {
  try {
    const service = await services.findById(payload.serviceId);
    if (!service) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found", "");
    }

    // Verify that both before and after work progress records have been uploaded
    const progressCount = await workprogress.countDocuments({
      serviceId: payload.serviceId,
      isDelete: { $ne: true }
    });
    if (progressCount < 2) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "You must upload both before and after images before completing the service.",
        ""
      );
    }

    // Automatic charge of remaining 50% if not already paid
    if (!service.isCompletePayment && service.stripeCustomerId && service.stripePaymentMethodId) {
      try {
        const remainingAmount = Math.round((service.totalAmount / 2) * 100);
        if (remainingAmount > 0) {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: remainingAmount,
            currency: "usd",
            customer: service.stripeCustomerId,
            payment_method: service.stripePaymentMethodId,
            off_session: true,
            confirm: true,
          });

          // Create payment record in database
          const customerUser = await users.findById(service.userId);
          await payments.create({
            userId: service.userId,
            serviceId: service._id,
            sessionId: `auto_${Date.now()}`,
            price: service.totalAmount / 2,
            currency: "usd",
            paymentmethod: "card",
            payment_status: "paid",
            payable_name: customerUser?.name || "Customer",
            payable_email: customerUser?.email || "",
            payment_intent: paymentIntent.id,
            country: customerUser?.country || "US",
          });

          console.log(`Auto-charged remaining 50% ($${remainingAmount / 100}) for service ${service._id}. PaymentIntent: ${paymentIntent.id}`);
        }
      } catch (stripeError: any) {
        console.error(`Stripe auto-charge failed for service ${service._id}:`, stripeError.message);
        // Even if stripe auto-charge fails (e.g. card declined), we still mark the service as ended
        // and complete the payment on the database so the cleaner gets paid (as user requested: "cleaner to full money peye jabei").
      }
    }

    service.isCompletionRequested = false;
    service.isServiceEed = true;
    service.isCompletePayment = true;
    await service.save();

    cache.flushAll();
    return service;
  } catch (error) {
    throw catchError(error);
  }
};

const acceptCompletionIntoDb = async (
  payload: { serviceId: string },
  userId: string
) => {
  try {
    const service = await services.findById(payload.serviceId);
    if (!service) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found", "");
    }

    service.isCompletionRequested = false;
    service.isServiceEed = true;
    service.isCompletePayment = true;
    await service.save();

    cache.flushAll();
    return service;
  } catch (error) {
    throw catchError(error);
  }
};

const JobsServices = {
  createNewJobsServicesIntoDb,
  findMyAllServicesIntoDb,
  deleteJobsServicesIntoDb,
  findBySpecificServiceIntoDb,
  extendDeadlineIntoDb,
  acceptExtensionIntoDb,
  requestCompletionIntoDb,
  acceptCompletionIntoDb,
};

export default JobsServices;