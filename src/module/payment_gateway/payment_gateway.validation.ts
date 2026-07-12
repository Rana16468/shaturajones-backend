import { z } from 'zod';

const refreshOnboardingLink = z.object({
  body: z.object({}).strict(),
});

const createPaymentIntent = z.object({
  body: z.object({
    price: z
      .number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number',
      })
      .positive('Price must be positive'),
      serviceId: z
      .string({
        required_error: 'SubscriptionId is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid truck ID format'),

    description: z.string().optional(),
  }),
});


const createCheckoutSession = z.object({
  body: z.object({
    price: z
      .number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number',
      })
      .positive('Price must be positive'),
    serviceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid truck ID format')
      .optional(),
    bookingData: z
      .object({
        jobId: z.string({ required_error: 'Job ID is required in bookingData' }),
        selectedDate: z.string({ required_error: 'Selected Date is required in bookingData' }),
        availablePackagesService: z
          .array(
            z.object({
              availablePackageId: z.string(),
              isDelete: z.boolean().optional(),
            })
          )
          .optional(),
        addOnsService: z
          .array(
            z.object({
              addOnsId: z.string(),
              isDelete: z.boolean().optional(),
            })
          )
          .optional(),
      })
      .optional(),
    description: z.string().optional(),
  }),
});

const cashPaymentSchema = z.object({
  body: z.object({
    price: z
      .number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number',
      })
      .positive('Price must be positive'),

    description: z.string().optional(),
  }),
});


 const PaymentValidation = {
  refreshOnboardingLink,
  createPaymentIntent,
  createCheckoutSession,
  cashPaymentSchema,
};
export default PaymentValidation;
