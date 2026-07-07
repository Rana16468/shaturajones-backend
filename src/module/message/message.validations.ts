import { z } from "zod";

const messageSchema = z.object({
  body: z
    .object({
      text: z.string().trim().optional(),
      imageUrl: z.array(z.string()).optional(),
      serviceId: z.string().optional(),
      audioUrl: z.string().optional(),
      receiverId: z.string({
        required_error: "receiverId is required",
      }),
    })
    .strict()
    .superRefine((data, ctx) => {
      const hasText = !!data.text?.trim();
      const hasImage = Array.isArray(data.imageUrl) && data.imageUrl.length > 0;
      const hasAudio = !!data.audioUrl?.trim();

      if (!hasText && !hasImage && !hasAudio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either text, imageUrl, or audioUrl is required.",
          path: ["text"],
        });
      }
    }),
});

const messageUpdateSchema = z.object({
  body: z
    .object({
      text: z.string().trim().min(1, "Text is required").optional(),
      imageUrl: z.array(z.string()).optional(),
      audioUrl: z.string().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      const hasText = !!data.text?.trim();
      const hasImage = Array.isArray(data.imageUrl) && data.imageUrl.length > 0;
      const hasAudio = !!data.audioUrl?.trim();

      if (!hasText && !hasImage && !hasAudio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one field is required.",
          path: ["text"],
        });
      }
    }),
});

const MessageValidationSchema = {
  messageSchema,
  messageUpdateSchema,
};

export default MessageValidationSchema;