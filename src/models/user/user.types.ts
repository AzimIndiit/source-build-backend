import { Document, Model } from 'mongoose';

/**
 * 
 * User role enumeration
 */
export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  DRIVER = 'driver',
  ADMIN = 'admin',
}


export enum AuthType {
  EMAIL = 'email',
  GOOGLE = 'google',
}

/**
 * User account status enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * Social login provider enumeration
 */
export enum SocialProvider {
  GOOGLE = 'google',
  LINKEDIN = 'linkedin',
}

/**
 * Address type enumeration
 */
export enum AddressType {
  BILLING = 'billing',
  SHIPPING = 'shipping',
  BOTH = 'both',
}

/**
 * Gender enumeration
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

/**
 * Theme enumeration
 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

/**
 * Address interface
 */
export interface IAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
  type: AddressType;
}


/**
 * Base profile interface with common fields
 */
interface IBaseProfile {
  phone: string;
  cellPhone?: string;
  addresses: IAddress[];
}

/**
 * Buyer-specific profile
 */
export interface IBuyerProfile extends IBaseProfile {
  role: UserRole.BUYER;
  
}

/**
 * Seller-specific profile
 */
export interface ISellerProfile extends IBaseProfile {
  role: UserRole.SELLER;
  businessName: string;
  einNumber: string;
  salesTaxId: string;
  businessAddress?: string;
  localDelivery?: boolean;
  phone: string;
  cellPhone?: string;
  
}

/**
 * Driver-specific profile
 */
export interface IDriverProfile extends IBaseProfile {
  role: UserRole.DRIVER;
  driverLicense: {
    number: string;
    verified: boolean;
    licenceImages: string[];
  },
  vehicles: [{
    type: string,
    make: string,
    model: string,
    vehicleImages: string[],
    insuranceImages: string[],
    registrationNumber: string
  }],
  isVehicles?: boolean;
  isLicense?: boolean;

}

/**
 * Admin-specific profile
 */
export interface IAdminProfile extends IBaseProfile {
  role: UserRole.ADMIN;
  department?: string;
  permissions?: string[];
  lastLoginIP?: string;
  twoFactorEnabled?: boolean;
  adminLevel?: 'super' | 'standard' | 'support';
}

/**
 * Discriminated union for user profiles based on role
 */
export type IUserProfile = IBuyerProfile | ISellerProfile | IDriverProfile | IAdminProfile;

/**
 * User preferences interface
 */
export interface IUserPreferences {
  language: string;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  theme: Theme;
}

/**
 * Auth subdocument interface
 */
export interface IUserAuth {
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
}

/**
 * Base user interface (without Document)
 */
export interface IUserBase<T extends IUserProfile = IUserProfile> {
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  profile: T;
  refreshTokens: string[];
  rememberMe?: boolean;
  termsAccepted: boolean;
  currentLocationId?: string | any;
  auth: IUserAuth;
}

/**
 * User document interface (with Mongoose Document)
 */
export interface IUser extends IUserBase<IUserProfile>, Document {
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isEmailVerified?: boolean;
  authType?: AuthType;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  isOnline?: boolean;
  currentLocationId?: string | any;
   
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  addRefreshToken(token: string): Promise<void>;
  removeRefreshToken(token: string): Promise<void>;
  clearRefreshTokens(): Promise<void>;
  isAccountLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  toJSON(): any;
}

/**
 * User model interface with static methods
 */
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  findByEmailOrUsername(identifier: string): Promise<IUser | null>;
  findBySocialAccount(provider: string, providerId: string): Promise<IUser | null>;
  createUser(userData: Partial<IUserBase>): Promise<IUser>;
  validateBuyerRegistration(data: any): Promise<{ valid: boolean; errors?: any }>;
  validateSellerRegistration(data: any): Promise<{ valid: boolean; errors?: any }>;
  validateDriverRegistration(data: any): Promise<{ valid: boolean; errors?: any }>;
  findByPhoneAndRole(phone: string, role: UserRole): Promise<IUser | null>;
}

/**
 * Input types for user operations
 */
export interface CreateUserInput extends Omit<IUserBase, 'status' | 'refreshTokens' | 'profile'> {
  status?: UserStatus;
  profile: Partial<IUserProfile>;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<IUserProfile>;
  rememberMe?: boolean;
}

export interface RegisterUserInput {
  email: string;
  password: string;
  businessName: string;
  fullName: string;
  phone: string;
  cellPhone?: string;
  einNumber: string;
  salesTaxId: string;
  localDelivery?: boolean;
  termsAccepted: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}