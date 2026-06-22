import { z } from "zod";
import { JobType } from "./createJobs.constant";


 const availablePackageZodSchema = z.object({
  jobName: z.string({
    required_error: "jobName is required",
  }),

  price: z.number({
    required_error: "price is required",
  }),

  isDelete: z.boolean().optional(),
});

const updateAvailablePackageZodSchema = z.object({
  jobName: z.string({
    required_error: "jobName is required",
  }).optional(),

  price: z.number({
    required_error: "price is required",
  }).optional(),

  isDelete: z.boolean().optional(),
});


 const createJobsZodSchema = z.object({
   body: z.object({
    jobName: z.string({
    required_error: "jobName is required",
  }),

  jobType: z.literal("CLEANING", {
    errorMap: () => ({
      message: "jobType must be CLEANING",
    }),
  }).default(JobType.CLEANING),
  photo: z.string().optional(),

  isDelete: z.boolean().optional(),

  rating: z.number().optional(),

  availablePackages: z.array(availablePackageZodSchema).default([]),
   })
});

 const updateCreateJobsZodSchema = z.object({
   body: z.object({
    jobName: z.string({
    required_error: "jobName is required",
  }).optional(),

  jobType: z.literal("CLEANING", {
    errorMap: () => ({
      message: "jobType must be CLEANING",
    }),
  }).default(JobType.CLEANING).optional(),
  photo: z.string().optional(),

  isDelete: z.boolean().optional(),

  rating: z.number().optional(),

  availablePackages: z.array(updateAvailablePackageZodSchema).default([]).optional(),
   })
});

const createJobValidation={
    createJobsZodSchema,
    updateCreateJobsZodSchema
}
export default createJobValidation