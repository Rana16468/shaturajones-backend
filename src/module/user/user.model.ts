import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../app/config';
import { USER_ROLE, USER_ACCESSIBILITY } from './user.constant';
import { TUser, UserModel } from './user.interface';


const UserSchema = new Schema<TUser, UserModel>(
  {
    role: {
      type: String,
      enum: {
        values: [
          USER_ROLE.cleaner,
          USER_ROLE.customer,
          USER_ROLE.admin,
          USER_ROLE.superAdmin,
        ],
        message: '{VALUE} is not a valid role',
      },
      required: true,
      index: true 
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    location: {
      type: String,
      required:true 
    },

    verificationCode: {
      type: String,
      required: false,
      default: null,
      index: true
    },

    isVerify: {
      type: Boolean,
      index: true ,
      default: false,
    },

    status: {
      type: String,
      enum: {
        values: [USER_ACCESSIBILITY.isProgress, USER_ACCESSIBILITY.blocked],
        message: '{VALUE} is not a valid status',
      },
      default: USER_ACCESSIBILITY.isProgress,
      index: true
    },

    photo: {
      type: String,
      required: false,
      default: null,
    },

    nationalId: {
      type: String,
      required: false,
      default: null,
    },

    isValidate: {
      type: Boolean,
       required: false,
      default: false,

    },

    cleaningExperience: {
      type: String,
      required: false,
      default: null,
    },

    skills: {
      type: [String],
      required: false,
      default: null,
    },

    dateOfBirth: {
      type: String,
      required: false,
      default: null,
    },

    country: {
      type: String,
      required: false,
      default: null,
    },

    phoneNumber: {
      type: String,
      required: false,
      index: true , 
      default: null
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      required: false,
    },

    stripeAccountId: {
      type: String,
      required: false,
      default: null

    },

    isStripeConnected: {
      type: Boolean,
      default: false,
         required: false,
    },

    fcm: {
      type: String,
       required: false,
      default: null,
    },

    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);


UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

UserSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

UserSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

UserSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

UserSchema.statics.isUserExistByCustomId = async function (id: string) {
  return await this.findOne({ id }).select('+password');
};

UserSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashPassword: string,
) {
  return await bcrypt.compare(plainTextPassword, hashPassword);
};

UserSchema.statics.isJWTIssuesBeforePasswordChange = function (
  passwordChangeTimestamp: Date,
  jwtIssuedTime: number,
) {
  const passwordChangeTime =
    new Date(passwordChangeTimestamp).getTime() / 1000;

  return passwordChangeTime > jwtIssuedTime;
};

const users = model<TUser, UserModel>('users', UserSchema);

export default users