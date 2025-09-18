import type { Model } from 'mongoose';
import type { IUser, IUserModel, CreateUserInput, UserRole } from './user.types.js';
import { z } from 'zod';


/**
 * User static methods for the model
 */

/**
 * Find user by email address (excluding deleted accounts)
 */
export async function findByEmail(this: Model<IUser>, email: string): Promise<IUser | null> {
  return this.findOne({ 
    email: email.toLowerCase(),
    status: { $ne: 'deleted' } // Exclude deleted accounts
  }).select('+password').exec();
}

/**
 * Find user by username (excluding deleted accounts)
 */
export async function findByUsername(this: Model<IUser>, username: string): Promise<IUser | null> {
  return this.findOne({ 
    username: username.toLowerCase(),
    status: { $ne: 'deleted' } // Exclude deleted accounts
  }).select('+password').exec();
}

/**
 * Find user by either email or username (excluding deleted accounts)
 */
export async function findByEmailOrUsername(
  this: Model<IUser>,
  identifier: string
): Promise<IUser | null> {
  const lowerIdentifier = identifier.toLowerCase();
  return this.findOne({
    $or: [
      { email: lowerIdentifier },
      { username: lowerIdentifier }
    ],
    status: { $ne: 'deleted' } // Exclude deleted accounts
  }).select('+password').exec();
}

/**
 * Find user by social account provider and ID
 */
export async function findBySocialAccount(
  this: Model<IUser>,
  provider: string,
  providerId: string
): Promise<IUser | null> {
  return this.findOne({
    'profile.socialAccounts': {
      $elemMatch: {
        provider,
        providerId
      }
    }
  }).exec();
}

/**
 * Create a new user with the provided data
 */
export async function createUser(
  this: IUserModel,
  userData: CreateUserInput
): Promise<IUser> {
  const user = new this(userData);
  return user.save();
}

/**
 * Find users by role with pagination
 */
export async function findByRole(
  this: Model<IUser>,
  role: string,
  options: { page?: number; limit?: number; sort?: string } = {}
): Promise<{
  users: IUser[];
  total: number;
  page: number;
  pages: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || '-createdAt';
  
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    this.find({ role })
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .exec(),
    this.countDocuments({ role })
  ]);
  
  return {
    users,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Find active users with pagination
 */
export async function findActiveUsers(
  this: Model<IUser>,
  options: { page?: number; limit?: number; sort?: string } = {}
): Promise<{
  users: IUser[];
  total: number;
  page: number;
  pages: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || '-createdAt';
  
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    this.find({ status: 'active' })
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .exec(),
    this.countDocuments({ status: 'active' })
  ]);
  
  return {
    users,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Search users by text (business name, full name, email)
 */
export async function searchUsers(
  this: Model<IUser>,
  searchQuery: string,
  options: { page?: number; limit?: number } = {}
): Promise<{
  users: IUser[];
  total: number;
  page: number;
  pages: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  
  const query = {
    $or: [
      { email: { $regex: searchQuery, $options: 'i' } },
      { username: { $regex: searchQuery, $options: 'i' } },
      { 'profile.businessName': { $regex: searchQuery, $options: 'i' } },
      { 'profile.fullName': { $regex: searchQuery, $options: 'i' } },
      { 'profile.displayName': { $regex: searchQuery, $options: 'i' } }
    ]
  };
  
  const [users, total] = await Promise.all([
    this.find(query)
      .sort('-createdAt')
      .limit(limit)
      .skip(skip)
      .exec(),
    this.countDocuments(query)
  ]);
  
  return {
    users,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Validate buyer registration data
 */
export async function validateBuyerRegistration(
  this: Model<IUser>,
  data: any
): Promise<{ valid: boolean; errors?: any }> {
  try {
    // Validate with buyer-specific schema
    const buyerSchema = z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      phone: z.string().min(10, 'Phone number must be at least 10 digits'),
      cellPhone: z.string().optional(),
      termsAccepted: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the terms and conditions' }),
      }),
    });

    const result = buyerSchema.safeParse(data);
    
    if (!result.success) {
      return { 
        valid: false, 
        errors: result.error.flatten().fieldErrors 
      };
    }

    // Check if email already exists
    const existingUser = await this.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      return { 
        valid: false, 
        errors: { email: ['Email already registered'] } 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      errors: { general: ['Validation failed'] } 
    };
  }
}

/**
 * Validate seller registration data
 */
export async function validateSellerRegistration(
  this: Model<IUser>,
  data: any
): Promise<{ valid: boolean; errors?: any }> {
  try {
    // Validate with seller-specific schema
    const sellerSchema = z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      businessName: z.string().min(2, 'Business name must be at least 2 characters'),
      einNumber: z.string().min(1, 'EIN number is required'),
      salesTaxId: z.string().min(1, 'Sales Tax ID is required'),
      phone: z.string().min(10, 'Phone number must be at least 10 digits'),
      cellPhone: z.string().optional(),
      businessAddress: z.string().optional(),
      localDelivery: z.boolean().optional(),
      termsAccepted: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the terms and conditions' }),
      }),
    });

    const result = sellerSchema.safeParse(data);
    
    if (!result.success) {
      return { 
        valid: false, 
        errors: result.error.flatten().fieldErrors 
      };
    }

    // Check if email already exists
    const existingUser = await this.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      return { 
        valid: false, 
        errors: { email: ['Email already registered'] } 
      };
    }

    // Check if EIN number already exists
    const existingEIN = await this.findOne({ 'profile.einNumber': data.einNumber });
    if (existingEIN) {
      return { 
        valid: false, 
        errors: { einNumber: ['EIN number already registered'] } 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      errors: { general: ['Validation failed'] } 
    };
  }
}

/**
 * Validate driver registration data
 */
export async function validateDriverRegistration(
  this: Model<IUser>,
  data: any
): Promise<{ valid: boolean; errors?: any }> {
  try {
    // Validate with driver-specific schema
    const driverSchema = z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      phone: z.string().min(10, 'Phone number must be at least 10 digits'),
      cellPhone: z.string().optional(),
      driverLicenseNumber: z.string().min(1, 'Driver license number is required'),
      driverLicenseExpiry: z.string(),
      driverLicenseState: z.string().min(1, 'Driver license state is required'),
      termsAccepted: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the terms and conditions' }),
      }),
    });

    const result = driverSchema.safeParse(data);
    
    if (!result.success) {
      return { 
        valid: false, 
        errors: result.error.flatten().fieldErrors 
      };
    }

    // Check if email already exists
    const existingUser = await this.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      return { 
        valid: false, 
        errors: { email: ['Email already registered'] } 
      };
    }

    // Check if phone already exists for a driver
    const existingDriver = await this.findOne({ 
      role: 'driver',
      'profile.phone': data.phone 
    });
    if (existingDriver) {
      return { 
        valid: false, 
        errors: { phone: ['Driver already exists with this phone number'] } 
      };
    }

    // Check if driver license already exists
    const existingLicense = await this.findOne({ 
      'profile.driverLicense.number': data.driverLicenseNumber 
    });
    if (existingLicense) {
      return { 
        valid: false, 
        errors: { driverLicenseNumber: ['Driver license already registered'] } 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      errors: { general: ['Validation failed'] } 
    };
  }
}

/**
 * Find user by phone number for a specific role
 */
export async function findByPhoneAndRole(
  this: Model<IUser>,
  phone: string,
  role: UserRole
): Promise<IUser | null> {
  return this.findOne({ 
    role,
    'profile.phone': phone 
  }).exec();
}

/**
 * Get user statistics
 */
export async function getUserStats(this: Model<IUser>): Promise<{
  total: number;
  active: number;
  pending: number;
  suspended: number;
  buyers: number;
  sellers: number;
  drivers: number;
  admins: number;
  verifiedEmails: number;
  verifiedPhones: number;
}> {
  const [
    total,
    active,
    pending,
    suspended,
    buyers,
    sellers,
    drivers,
    admins,
    verifiedEmails,
    verifiedPhones
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ status: 'pending' }),
    this.countDocuments({ status: 'suspended' }),
    this.countDocuments({ role: 'buyer' }),
    this.countDocuments({ role: 'seller' }),
    this.countDocuments({ role: 'driver' }),
    this.countDocuments({ role: 'admin' }),
    this.countDocuments({ 'auth.emailVerifiedAt': { $ne: null } }),
    this.countDocuments({ 'auth.phoneVerifiedAt': { $ne: null } })
  ]);
  
  return {
    total,
    active,
    pending,
    suspended,
    buyers,
    sellers,
    drivers,
    admins,
    verifiedEmails,
    verifiedPhones
  };
}

/**
 * Bind all static methods to the schema
 */
export function bindStatics(schema: any): void {
  schema.statics.findByEmail = findByEmail;
  schema.statics.findByUsername = findByUsername;
  schema.statics.findByEmailOrUsername = findByEmailOrUsername;
  schema.statics.findBySocialAccount = findBySocialAccount;
  schema.statics.createUser = createUser;
  schema.statics.findByRole = findByRole;
  schema.statics.findActiveUsers = findActiveUsers;
  schema.statics.searchUsers = searchUsers;
  schema.statics.getUserStats = getUserStats;
  schema.statics.validateBuyerRegistration = validateBuyerRegistration;
  schema.statics.validateSellerRegistration = validateSellerRegistration;
  schema.statics.validateDriverRegistration = validateDriverRegistration;
  schema.statics.findByPhoneAndRole = findByPhoneAndRole;
}