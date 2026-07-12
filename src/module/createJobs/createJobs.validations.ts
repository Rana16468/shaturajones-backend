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
  jobName: z
    .string({
      required_error: "jobName is required",
    })
    .optional(),

  price: z
    .number({
      required_error: "price is required",
    })
    .optional(),

  isDelete: z.boolean().optional(),
});


const addOnsZodSchema = z.object({
  jobName: z.string({
    required_error: "jobName is required",
  }),

  price: z.number({
    required_error: "price is required",
  }),

  isDelete: z.boolean().optional(),
});

const updateAddOnsZodSchema = z.object({
  jobName: z
    .string({
      required_error: "jobName is required",
    })
    .optional(),

  price: z
    .number({
      required_error: "price is required",
    })
    .optional(),

  isDelete: z.boolean().optional(),
});

const createJobsZodSchema = z.object({
  body: z.object({
    jobName: z.string({
      required_error: "jobName is required",
    }),

    jobType: z
      .literal("CLEANING", {
        errorMap: () => ({
          message: "jobType must be CLEANING",
        }),
      })
      .default(JobType.CLEANING),

    category: z.string({
      required_error: "category is required",
    }),

    photo: z.string().optional(),

    isDelete: z.boolean().optional(),

    rating: z.number().optional(),

    availablePackages: z.array(availablePackageZodSchema).default([]),

    addOns: z.array(addOnsZodSchema).default([]),
  }),
});

const updateCreateJobsZodSchema = z.object({
  body: z.object({
    jobName: z
      .string({
        required_error: "jobName is required",
      })
      .optional(),

    jobType: z
      .literal("CLEANING", {
        errorMap: () => ({
          message: "jobType must be CLEANING",
        }),
      })
      .default(JobType.CLEANING)
      .optional(),

    category: z.string().optional(),

    photo: z.string().optional(),

    isDelete: z.boolean().optional(),

    rating: z.number().optional(),

    availablePackages: z
      .array(updateAvailablePackageZodSchema)
      .default([])
      .optional(),

    // ✅ Added
    addOns: z.array(updateAddOnsZodSchema).default([]).optional(),
  }),
});

const createJobValidation = {
  createJobsZodSchema,
  updateCreateJobsZodSchema,
};

export default createJobValidation;