import { Model } from 'mongoose';
import { USER_ROLE } from './user.constant';



export interface UserResponse {
  status: boolean;
  message: string;
}

export type TUser = {
  id: string;
  role: 'cleaner' | 'customer' | 'admin' | 'superAdmin';
  name: string;
  password: string;
  email: string;
  location?: string;
  verificationCode: string;
  isVerify: boolean;
  status: 'isProgress' | 'Blocked';
  photo?: string;
  nationalId?: string;
  isValidate?: boolean;
  cleaningExperience?: string;
  skills?: string[]
  dateOfBirth?: string;
  country?: string;
  phoneNumber?: string;
  isOnline?: boolean;
  stripeAccountId?: string;
  isStripeConnected?: boolean;
  fcm?:string;
  isAvailable?: boolean;
  isDelete: boolean;
};

export interface UserModel extends Model<TUser> {

  isUserExistByCustomId(id: string): Promise<TUser>;

  isPasswordMatched(
    userSendingPassword: string,
    existingPassword: string,
  ): Promise<boolean>;
  isJWTIssuesBeforePasswordChange(
    passwordChangeTimestamp: Date,
    jwtIssuesTime: number,
  ): Promise<boolean>;
}

export type TUserRole = keyof typeof USER_ROLE;
