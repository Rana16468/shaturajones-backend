import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { TCreateJobs } from "./createJobs.interface";
import createjobs from "./createJobs.model";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { cache, job_search_filed } from "./createJobs.constant";
import fs from "fs";

const createJobIntoDb=async(payload:TCreateJobs):Promise<{
    success: boolean,
    message: string
}>=>{

     try{

        const result=await createjobs.create(payload);

        if(!result){
            throw new ApiError(httpStatus.NOT_EXTENDED, 'issues by the create jobs section',"")
        }

        return {
            success: true , 
            message:"successfully create a new jobs"
        }

     }
     catch(error){
        throw catchError(error)
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
) :Promise<{
    success: boolean,
    message: string
}>=> {
  try {
    const {
      availablePackages,
      photo,
      ...rest
    } = payload;

    const isExistJobs = await createjobs
      .findById(id)
      .select("photo")
      .lean();

    if (!isExistJobs) {
      throw new Error("Job not found");
    }

    const updateData: any = {
      $set: {
        ...rest,
      },
    };

    if (photo) {
      updateData.$set.photo = photo.replace(/\\/g, "/");
    }

    if (availablePackages) {
      updateData.$set.availablePackages = availablePackages;
    }

    const result = await createjobs.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (photo && isExistJobs.photo) {
      try {
        if (fs.existsSync(isExistJobs.photo)) {
          fs.unlinkSync(isExistJobs.photo);
        }
      } catch (err) {
        console.log("Photo delete failed:", err);
      }
    }
    if(!result){
        throw new ApiError(httpStatus.NOT_EXTENDED, "issues by the update jobs", "")
    }

    return {
        success:  true , 
        message:"successfully update jobs"
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
    if (job.photo) {
      try {
        if (fs.existsSync(job.photo)) {
          fs.unlinkSync(job.photo);
        }
      } catch (err) {
        console.log("Photo delete error:", err);
      }
    }
    return result;
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