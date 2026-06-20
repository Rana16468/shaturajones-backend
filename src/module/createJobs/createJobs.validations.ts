import { z } from "zod";


 const availablePackageZodSchema = z.object({
  jobName: z.string({
    required_error: "jobName is required",
  }),

  price: z.number({
    required_error: "price is required",
  }),

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
  }),
  photo: z.string().optional(),

  isDelete: z.boolean().optional(),

  rating: z.number().optional(),

  availablePackages: z.array(availablePackageZodSchema).default([]),
   })
});

const createJobValidation={
    createJobsZodSchema
}
export default createJobValidation