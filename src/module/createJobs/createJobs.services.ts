import catchError from "../../app/error/catchError";
import { TCreateJobs } from "./createJobs.interface";

const createJobIntoDb=async(payload:TCreateJobs)=>{

     try{

        return {
            payload
        }

     }
     catch(error){
        throw catchError(error)
     }
};

const CreateJobServices={
    createJobIntoDb
}

export default CreateJobServices;