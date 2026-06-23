import { z } from "zod";

 const createServiceValidationSchema = z.object({
  body: z.object({
   
    jobId: z
      .string({
        required_error: "Job ID is required",
      })
      .min(1, "Job ID is required"),

    availablePackagesService: z
      .array(
        z.object({
          availablePackageId: z
            .string({
              required_error: "Available Package ID is required",
            })
            .min(1, "Available Package ID is required"),

          isDelete: z.boolean().optional().default(false),
        })
      )
      .optional(),

    addJobsPackages: z
      .array(
        z.object({
          jobName: z
            .string({
              required_error: "Job Name is required",
            })
            .min(1, "Job Name is required"),

          price: z
            .number({
              required_error: "Price is required",
            })
            .min(0, "Price cannot be negative"),

          isDelete: z.boolean().optional().default(false),
        })
      )
      .optional(),

    selectedDate: z.coerce.date({
      required_error: "Selected Date is required",
    }),

    isAccepted: z.boolean().optional().default(false),

    isServiceStarted: z.boolean().optional().default(false),

    isServiceEed: z.boolean().optional().default(false),

    isAdvancePayment: z.boolean().optional().default(false),

    isCompletePayment: z.boolean().optional().default(false),

    isDelete: z.boolean().optional().default(false),
  }),
});

const ServiceValidation={
    createServiceValidationSchema
}
export default ServiceValidation