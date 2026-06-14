import { object, z } from 'zod';
import { USER_ACCESSIBILITY, USER_ROLE } from './user.constant';

const createUserZodSchema = z.object({


  body: z.object({
    role: z.enum(
      Object.values(USER_ROLE) as [string, ...string[]],
      {
        required_error: 'Role is required',
        invalid_type_error: 'Invalid role',
      },
    ),

    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters'),

    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email format'),

    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),

    location: z
      .string({ required_error: 'Location is required' })
      .min(2, 'Location must be at least 2 characters'),
  }),
});


const UserVerification = z.object({
  body: z.object({
    verificationCode: z
      .string({ required_error: 'Verification code is required' }),
  }),
});

const ChangePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({ required_error: 'Old password is required' })
      .min(6, 'Minimum 6 characters required'),

    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'Minimum 6 characters required'),
  }),
});


const UpdateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    photo: z.string().optional(),
    location: z.string().optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    country: z.string().optional()

  }),
});

const buildCleanerProfile=z.object({
  body: z.object({
     photo: z.string({required_error:"photo is required"}),
     nationalId: z.string({required_error:"nationalId is  required"}),
     cleaningExperience: z.string({required_error:"cleaningExperience is  required"}),
     skills: z.array(z.string({required_error:"skills is required"})),


  })
})


const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email format'),
  }),
});

/* ---------------- VERIFY CODE (RESET FLOW) ---------------- */
const verificationCodeSchema = z.object({
  body: z.object({
    verificationCode: z
      .string({ required_error: 'Verification code is required' })
      
  }),
});

/* ---------------- RESET PASSWORD ---------------- */
const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'token is required' }),

    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Minimum 6 characters required'),
  }),
});

/* ---------------- EXPORT ---------------- */
const UserValidationSchema = {
  createUserZodSchema,
  UserVerification,
  ChangePasswordSchema,
  UpdateUserProfileSchema,
  ForgotPasswordSchema,
  verificationCodeSchema,
  resetPasswordSchema,
  buildCleanerProfile
};

export default UserValidationSchema;