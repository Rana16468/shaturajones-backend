import { z } from "zod";

const createRatingReviewValidationSchema = z.object({
  body: z.object({
    serviceId: z
      .string({
        required_error: "Service ID is required.",
      })
      .trim()
      .min(1, "Service ID is required."),

      rating: z.number({
        required_error: "Rating is required.",
        invalid_type_error: "Rating must be a number.",
      })
      .min(1, "Rating must be at least 1.")
      .max(5, "Rating cannot be greater than 5."),


    review: z
      .string({
        required_error: "Review is required.",
      })
      .trim()
      .min(1, "Review cannot be empty.")
      .max(1000, "Review cannot exceed 1000 characters."),
  }).optional(),
});

const updateRatingReviewValidationSchema = z.object({
  body: z.object({
    rating: z
      .number({
        invalid_type_error: "Rating must be a number.",
      })
      .min(1, "Rating must be at least 1.")
      .max(5, "Rating cannot be greater than 5.")
      .optional(),

    review: z
      .string()
      .trim()
      .min(1, "Review cannot be empty.")
      .max(1000, "Review cannot exceed 1000 characters.")
      .optional(),
  }),
});

 const RatingReviewValidation = {
  createRatingReviewValidationSchema,
  updateRatingReviewValidationSchema,
};

export default RatingReviewValidation;