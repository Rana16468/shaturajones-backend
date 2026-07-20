import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { TCreateJobs } from "./createJobs.interface";
import createjobs from "./createJobs.model";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { cache, job_search_filed } from "./createJobs.constant";
import fs from "fs";
import { sendFileToCloudinary } from "../../utility/Cloudinary/sendFileToCloudinary";
import deleteFileFromCloudinary from "../../utility/Cloudinary/deleteFileFromCloudinary";

const createJobIntoDb = async (payload: TCreateJobs): Promise<{
  success: boolean,
  message: string
}> => {
  try {
    const finalPayload = { ...payload };

    if (payload.photo && typeof payload.photo === 'string') {
      const fileName = `${Date.now()}-job-photo`;
      
      const uploaded = await sendFileToCloudinary(fileName, payload.photo);
      
      finalPayload.photo = uploaded.secure_url;
    }
    const result = await createjobs.create(finalPayload);

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR, 
        'Failed to create job, something went wrong', 
        ""
      );
    }

    return {
      success: true,
      message: "Successfully created a new job"
    };

  } catch (error) {
    throw catchError(error);
  }
};

const findByAllJobsIntoDb = async (
  query: Record<string, unknown>
) => {
  try {
    const cacheKey = `jobs_${JSON.stringify(query)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    
    const jobsQuery = new QueryBuilder(
      createjobs
        .find({ isDelete: false })
        .lean(),
      query
    )
      .search(job_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const jobs = await jobsQuery.modelQuery;
    const meta = await jobsQuery.countTotal();

    const result = {
      meta,
      data: jobs,
    };

    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    throw catchError(error);
  }
};

const findBySpecificJobsIntoDb=async(id: string)=>{

     try{

        return await createjobs.findById(id);

     }
      catch (error) {
    throw catchError(error);
  }

     
}

const updateJobsIntoDb = async (
  id: string,
  payload: Partial<TCreateJobs>
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const {
      availablePackages,
      addOns,
      photo,
      ...rest
    } = payload;

    const isExistJobs = await createjobs
      .findById(id)
      .select("photo")
      .lean();

    if (!isExistJobs) {
      throw new ApiError(httpStatus.NOT_FOUND, "Job not found", "");
    }

    const updateData: any = {
      $set: {
        ...rest,
      },
    };


    if (photo && typeof photo === 'string') {
    
      const fileName = `${Date.now()}-update-job`;
      const uploaded = await sendFileToCloudinary(fileName, photo);
      
     
      updateData.$set.photo = uploaded.secure_url;

  
      if (isExistJobs.photo) {
        try {
          await deleteFileFromCloudinary(isExistJobs.photo);
        } catch (err) {
          console.error("Old photo delete failed from Cloudinary:", err);
        }
      }
    }

    if (availablePackages) {
      updateData.$set.availablePackages = availablePackages;
    }

    if (addOns) {
      updateData.$set.addOns = addOns;
    }

    // ৩. ডেটাবেজ আপডেট করুন
    const result = await createjobs.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Issues by the update jobs",
        ""
      );
    }

    return {
      success: true,
      message: "Successfully updated jobs",
    };
  } catch (error) {
    throw catchError(error);
  }
};

const deleteJobsIntoDb = async (id: string) => {
  try {

    const job = await createjobs
      .findById(id)
      .select("photo")
      .lean();

    if (!job) {
      throw new ApiError(httpStatus.NOT_FOUND, "Job not found", "");
    }
    const result = await createjobs.findByIdAndDelete(id);

    if (!result) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to delete job from database",
        ""
      );
    }

    if (job.photo) {
      try {
        await deleteFileFromCloudinary(job.photo);
      } catch (err) {
        console.error("Cloudinary photo delete error during job deletion:", err);
      }
    }

    return {
      success: true,
      message: "Successfully deleted the job and associated media",
      data: result
    };
  } catch (error) {
    throw catchError(error);
  }
};



const CreateJobServices={
    createJobIntoDb,
    findByAllJobsIntoDb,
    findBySpecificJobsIntoDb,
    updateJobsIntoDb,
    deleteJobsIntoDb
}

export default CreateJobServices;