import { z } from "zod";

const PhotoValidationSchema = z.object({
  photo: z
    .string({
      required_error: "Photo is required",
    })
    .min(1, "Photo is required"),
});

const createWorkProgressValidationSchema = z.object({
  body: z.object({
    serviceId: z.string({
      required_error: "Service ID is required",
    }),

   

    photo: z
      .array(PhotoValidationSchema)
      .min(1, "At least one photo is required").optional(),

    isDelete: z.boolean().optional(),
  }),
});

const updateWorkProgressValidationSchema = z.object({
  body: z.object({
    serviceId: z.string().optional(),
    userId: z.string().optional(),
    jobId: z.string().optional(),
    photo: z.array(PhotoValidationSchema).optional(),
    isDelete: z.boolean().optional(),
  }),
});

const WorkProgressValidation = {
  createWorkProgressValidationSchema,
  updateWorkProgressValidationSchema,
};

export default WorkProgressValidation;