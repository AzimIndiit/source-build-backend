import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import validator from 'validator'
import config from '@config/index.js'

// Import types
import type { IUser, IUserModel, IUserAuth } from './user.types.js'
import { UserRole, UserStatus, AuthType } from './user.types.js'

// Import schemas
import { 
  userProfileSchema, 
  userSchemaOptions, 
  createUserIndexes
} from './user.schemas.js'

// Import methods and statics
import { bindMethods } from './user.methods.js'
import { bindStatics } from './user.statics.js'

// Re-export types for backward compatibility
export { UserRole, UserStatus, AuthType } from './user.types.js'

export type { 
  IUser, 
  IUserModel, 
  IUserProfile,
  IBuyerProfile,
  ISellerProfile,
  IDriverProfile,
  IAdminProfile,
  IAddress,
  IUserAuth 
} from './user.types.js'

/**
 * Auth subdocument schema
 */
const authSchema = new Schema<IUserAuth>(
  {
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    lastLoginAt: Date,
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
)

/**
 * Main user schema definition
 */
const userSchema = new Schema<IUser>(
  {
    avatar: {
      type: String,
      validate: [validator.isURL, 'Avatar must be a valid URL'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    isEmailVerified: { type: Boolean, default: false },
    password: {
      type: String,
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.BUYER,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    rememberMe: {
      type: Boolean,
      default: false,
    },
    currentLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
      default: null,
    },
    profile: {
      type: userProfileSchema,
      required: true,
    },
    authType: {
      type: String,
      enum: Object.values(AuthType),
      default: AuthType.EMAIL,
    },
    refreshTokens: [
      {
        type: String,
      },
    ],
    auth: {
      type: authSchema,
      default: () => ({}),
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
  },
  userSchemaOptions
)

// Create indexes
createUserIndexes(userSchema)

// Pre-save middleware
userSchema.pre<IUser>('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS)
      this.password = await bcrypt.hash(this.password, salt)
    } catch (error) {
      return next(error as Error)
    }
  }

  // Generate display name if not provided
  if (!this?.displayName) {
    if (this?.firstName && this?.lastName) {
      this.displayName = `${this.firstName} ${this.lastName}`
    } else if (this?.displayName) {
      this.displayName = this.displayName
    }
  }

  // Auto-generate display name from email if not provided
  if (!this?.displayName && this.email) {
    this.displayName = this.email.split('@')[0]?.toLowerCase() || ''
  }

  // Initialize profile based on role if not exists
  if (!this.profile || this.isNew) {
    const defaultProfile: any = {
      role: this.role,
      phone: '',
      addresses: [],
    }

    // Add role-specific default fields
    switch (this.role) {
      case UserRole.BUYER:
        
        break
      case UserRole.SELLER:
        // Seller profile requires businessName, einNumber, salesTaxId
        // These should be provided during registration
        defaultProfile.phone = ''
        defaultProfile.cellPhone = ''
        defaultProfile.businessName = ''
        defaultProfile.einNumber = ''
        defaultProfile.salesTaxId = ''
        defaultProfile.businessAddress = ''
        defaultProfile.localDelivery = false
        break
      case UserRole.DRIVER:
        // Driver profile requires license info
        // These should be provided during registration
        defaultProfile.phone = ''
       
        defaultProfile.vehicles = []
        break
      case UserRole.ADMIN:
        defaultProfile.adminLevel = 'standard'
        defaultProfile.twoFactorEnabled = false
        defaultProfile.permissions = []
        break
    }

    // Merge with existing profile data
    this.profile = { ...defaultProfile, ...this.profile }
  }

  // Ensure profile.role matches user.role
  if (this.profile && !(this.profile as any).role) {
    (this.profile as any).role = this.role
  }

  // Validate role-specific required fields
  if (this.role === UserRole.SELLER) {
    const sellerProfile = this.profile as any
    console.log('sellerProfile', sellerProfile)
    if (!sellerProfile?.businessName) {
      return next(new Error('Business name is required for sellers'))
    }
    if (!sellerProfile?.einNumber) {
      return next(new Error('EIN number is required for sellers'))
    }
    if (sellerProfile?.localDelivery==='no' && !sellerProfile?.salesTaxId) {
      return next(new Error('Sales tax ID is required for sellers'))
    }
  }

  if (this.role === UserRole.DRIVER) {
    const driverProfile = this.profile as any
  
  }

  // Ensure only one default address per type
  const addressTypes = ['billing', 'shipping', 'both']
  addressTypes.forEach((type) => {
    const defaultAddresses =
      this.profile?.addresses?.filter(
        (addr: any) => addr.isDefault && (addr.type === type || addr.type === 'both')
      ) || []

    if (defaultAddresses.length > 1) {
      // Keep only the first one as default
      defaultAddresses.slice(1).forEach((addr: any) => {
        addr.isDefault = false
      })
    }
  })

  next()
})

// Bind instance methods
bindMethods(userSchema)

// Bind static methods
bindStatics(userSchema)

// Create and export the model
const UserModal = mongoose.model<IUser, IUserModel>('User', userSchema)

export default UserModal
