import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import catchError from "../../app/error/catchError";
import { TCreateJobs } from "./createJobs.interface";
import createjobs from "./createJobs.model";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { cache, job_search_filed } from "./createJobs.constant";


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

const CreateJobServices={
    createJobIntoDb,
    findByAllJobsIntoDb
}

export default CreateJobServices;