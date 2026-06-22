
import NodeCache from "node-cache";

export const cache = new NodeCache({
  stdTTL: 60 * 5, 
  checkperiod: 120,
});

export const JobType ={
    CLEANING:"CLEANING"
} as const;

export const job_search_filed=["jobName","availablePackages.jobName"]
