import { Schema } from 'mongoose';
import {
  IAddress,
  IUserProfile,
  IBuyerProfile,
  ISellerProfile,
  IDriverProfile,
  IAdminProfile,
  UserRole,
  AddressType,
} from './user.types.js';
import { string } from 'zod';



/**
 * Address schema for MongoDB
 */
export const addressSchema = new Schema<IAddress>(
  {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: Object.values(AddressType),
      default: AddressType.BOTH,
    },
  },
  { _id: false }
);



/**
 * Base profile schema with common fields
 */
const baseProfileSchema = {
  phone: {
    type: String,
    default: '',
  },
 
  addresses: {
    type: [addressSchema],
    default: [],
  },
};

/**
 * Buyer profile schema
 */
export const buyerProfileSchema = new Schema<IBuyerProfile>(
  {
    ...baseProfileSchema,
    role: {
      type: String,
      enum: [UserRole.BUYER],
      default: UserRole.BUYER,
      immutable: true,
    },
   
  },
  { _id: false, discriminatorKey: 'role' }
);

/**
 * Seller profile schema
 */
export const sellerProfileSchema = new Schema<ISellerProfile>(
  {
    ...baseProfileSchema,
    role: {
      type: String,
      enum: [UserRole.SELLER],
      default: UserRole.SELLER,
      immutable: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required for sellers'],
      minlength: [2, 'Business name must be at least 2 characters'],
    },
    einNumber: {
      type: String,
      required: [true, 'EIN number is required for sellers'],
    },
    salesTaxId: {
      type: String,
      required: [true, 'Sales tax ID is required for sellers'],
    },
    businessAddress: {
      type: String,
      default: '',
    },
    localDelivery: {
      type: Boolean,
      default: false,
    },
    cellPhone :{
       type:String,
       default:''
    },
    phone:{
      type:String,
      default:''
    }
  },
  { _id: false, discriminatorKey: 'role' }
);

/**
 * Driver profile schema
 */
export const driverProfileSchema = new Schema<IDriverProfile>(
  {
    ...baseProfileSchema,
    role: {
      type: String,
      enum: [UserRole.DRIVER],
      default: UserRole.DRIVER,
      immutable: true,
    },
    phone:{
      type:String,
      default:''
    },
  
    driverLicense: {
      number: {
        type: String,
        required: [true, 'Driver license number is required'],
      },
      licenceImages: {
        type: [String],
        required: [true, 'Driver license images are required'],
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    vehicles: [{
      make: String,
      model: String,
      vehicleImages: [String],
      insuranceImages: [String],
      registrationNumber: String,
    }],
    
  },
  { _id: false, discriminatorKey: 'role' }
);

/**
 * Admin profile schema
 */
export const adminProfileSchema = new Schema<IAdminProfile>(
  {
    ...baseProfileSchema,
    role: {
      type: String,
      enum: [UserRole.ADMIN],
      default: UserRole.ADMIN,
      immutable: true,
    },
    department: String,
    permissions: [String],
    lastLoginIP: String,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    adminLevel: {
      type: String,
      enum: ['super', 'standard', 'support'],
      default: 'standard',
    },
  },
  { _id: false, discriminatorKey: 'role' }
);

/**
 * Factory function to get the appropriate profile schema based on role
 */
export function getProfileSchemaByRole(role: UserRole): Schema<IUserProfile> {
  switch (role) {
    case UserRole.BUYER:
      return buyerProfileSchema as Schema<IUserProfile>;
    case UserRole.SELLER:
      return sellerProfileSchema as Schema<IUserProfile>;
    case UserRole.DRIVER:
      return driverProfileSchema as Schema<IUserProfile>;
    case UserRole.ADMIN:
      return adminProfileSchema as Schema<IUserProfile>;
    default:
      return buyerProfileSchema as Schema<IUserProfile>; // Default to buyer
  }
}

/**
 * Dynamic user profile schema that uses discriminator based on role
 */
export const userProfileSchema = new Schema<IUserProfile>(
  {},
  { 
    _id: false,
    discriminatorKey: 'role',
    strict: false // Allow flexibility for different profile types
  }
);



/**
 * Schema options for the main user schema
 */
export const userSchemaOptions = {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true },
};

/**
 * Create indexes for better query performance
 */
export const createUserIndexes = (schema: Schema) => {
  // Single field indexes
  schema.index({ email: 1 });
  schema.index({ displayName: 1 });
  schema.index({ role: 1 });
  schema.index({ status: 1 });
  schema.index({ createdAt: -1 });
  
  
  // Text index for search
  schema.index({ 
    'profile.businessName': 'text',
    'profile.fullName': 'text',
    'profile.displayName': 'text',
    email: 'text'
  });
  

};