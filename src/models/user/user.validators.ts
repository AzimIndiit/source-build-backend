import { z } from 'zod';
import { 
  UserRole, 
  UserStatus, 
  AddressType, 
} from './user.types.js';

/**
 * Phone number validation helper
 */
const phoneValidation = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .regex(/^[2-9]\d{2}[2-9]\d{6}$/, 'Invalid phone number format');

/**
 * Optional phone validation helper
 */
const optionalPhoneValidation = z
  .string()
  .optional()
  .refine((val) => {
    if (!val || val === '') return true;
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(cleaned);
  }, 'Invalid phone number format');

/**
 * Password validation with strength requirements
 */
const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .pipe(z.string()); // Convert back to ZodString

/**
 * Address schema validator
 */
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  isDefault: z.boolean().default(false),
  type: z.nativeEnum(AddressType).default(AddressType.BOTH),
});


/**
 * Base profile fields common to all roles
 */
const baseProfileFields = {
  cellPhone: optionalPhoneValidation,
  addresses: z.array(addressSchema).default([]),
};

/**
 * Buyer profile schema validator
 */
export const buyerProfileSchema = z.object({
  ...baseProfileFields,
  role: z.literal(UserRole.BUYER),
});

/**
 * Seller profile schema validator
 */
export const sellerProfileSchema = z.object({
  ...baseProfileFields,
  role: z.literal(UserRole.SELLER),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  einNumber: z.string().min(1, 'EIN number is required'),
  salesTaxId: z.string().min(1, 'Sales Tax ID is required'),
  businessAddress: z.string().optional(),
  localDelivery: z.boolean().optional().default(false),
  phone: phoneValidation, // Phone is required for sellers
  cellPhone: optionalPhoneValidation,
});

/**
 * Driver profile schema validator
 */
export const driverProfileSchema = z.object({
  ...baseProfileFields,
  role: z.literal(UserRole.DRIVER),
 
  phone: phoneValidation, // Phone is required for drivers
});

/**
 * Admin profile schema validator
 */
export const adminProfileSchema = z.object({
  ...baseProfileFields,
  role: z.literal(UserRole.ADMIN),
  department: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  lastLoginIP: z.string().optional(),
  twoFactorEnabled: z.boolean().optional(),
  adminLevel: z.enum(['super', 'standard', 'support']).optional(),
});

/**
 * User profile discriminated union based on role
 */
export const userProfileSchema = z.discriminatedUnion('role', [
  buyerProfileSchema,
  sellerProfileSchema,
  driverProfileSchema,
  adminProfileSchema,
]);

/**
 * Complete user schema validator
 */
export const userSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .toLowerCase()
    .optional(),
  password: passwordValidation.optional(),
  role: z.nativeEnum(UserRole).default(UserRole.BUYER),
  status: z.nativeEnum(UserStatus).default(UserStatus.PENDING),
  profile: userProfileSchema,
  refreshTokens: z.array(z.string()).default([]),
  rememberMe: z.boolean().optional().default(false),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Terms must be accepted',
  }),
});

/**
 * Base registration schema with common fields (without phone)
 */
const baseRegistrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
  confirmPassword: z.string(),
  cellPhone: optionalPhoneValidation,
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

/**
 * Buyer registration schema (phone not required)
 */
const buyerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal(UserRole.BUYER),
  phone: optionalPhoneValidation,  // Phone is optional for buyers
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Seller registration schema
 */
const sellerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal(UserRole.SELLER),
  phone: phoneValidation,  // Phone is required for sellers
  cellPhone: optionalPhoneValidation,
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  einNumber: z.string().min(1, 'EIN number is required'),
  salesTaxId: z.string().min(1, 'Sales Tax ID is required'),
  businessAddress: z.string().optional(),
  localDelivery: z.boolean().optional().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Driver registration schema
 */
const driverRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal(UserRole.DRIVER),
  phone: phoneValidation,  // Phone is required for drivers
  
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * User registration input validator using union instead of discriminatedUnion
 * This avoids type inference issues with complex validations
 */
export const registerUserSchema = z.union([
  buyerRegistrationSchema,
  sellerRegistrationSchema,
  driverRegistrationSchema,
]);

/**
 * Enhanced registration validation that provides clear error messages
 * This function validates the input based on role and returns specific errors
 */
export const validateRegistrationInput = (input: any) => {
  const { role, ...rest } = input;
  
  // First validate common required fields
  const commonValidation = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  });

  try {
    const commonFields = commonValidation.parse(rest);
    
    // Validate password confirmation
    if (commonFields.password !== commonFields.confirmPassword) {
      return {
        success: false,
        errors: [{
          field: 'confirmPassword',
          message: 'Passwords do not match',
          code: 'password_mismatch'
        }]
      };
    }

    // Role-specific validation
    switch (role) {
      case 'buyer':
        return { success: true, data: { ...commonFields, role: 'buyer' } };
        
      case 'seller':
        const sellerValidation = z.object({
          businessName: z.string().min(2, 'Business name must be at least 2 characters'),
          einNumber: z.string().min(1, 'EIN number is required'),
          salesTaxId: z.string().min(1, 'Sales Tax ID is required'),
          phone: z.string().min(10, 'Phone number is required for sellers').regex(/^[2-9]\d{2}[2-9]\d{6}$/, 'Invalid phone number format'),
        });
        
        try {
          const sellerFields = sellerValidation.parse(rest);
          return { success: true, data: { ...commonFields, ...sellerFields, role: 'seller' } };
        } catch (sellerError) {
          if (sellerError instanceof z.ZodError) {
            return {
              success: false,
              errors: sellerError.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              }))
            };
          }
        }
        break;
        
      case 'driver':
        const driverValidation = z.object({
          phone: z.string().min(10, 'Phone number is required for drivers').regex(/^[2-9]\d{2}[2-9]\d{6}$/, 'Invalid phone number format'),

        });
        
        try {
          const driverFields = driverValidation.parse(rest);
          return { success: true, data: { ...commonFields, ...driverFields, role: 'driver' } };
        } catch (driverError) {
          if (driverError instanceof z.ZodError) {
            return {
              success: false,
              errors: driverError.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              }))
            };
          }
        }
        break;
        
      default:
        return {
          success: false,
          errors: [{
            field: 'role',
            message: 'Invalid role. Must be one of: buyer, seller, driver',
            code: 'invalid_role'
          }]
        };
    }
    
  } catch (commonError) {
    if (commonError instanceof z.ZodError) {
      return {
        success: false,
        errors: commonError.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))
      };
    }
  }
  
  return {
    success: false,
    errors: [{
      field: '',
      message: 'Unknown validation error',
      code: 'unknown_error'
    }]
  };
};

/**
 * User login input validator
 */
export const loginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * User update input validator
 */
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  password: passwordValidation.optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  profile: z.union([
    buyerProfileSchema.partial(),
    sellerProfileSchema.partial(),
    driverProfileSchema.partial(),
    adminProfileSchema.partial(),
  ]).optional(),
  rememberMe: z.boolean().optional(),
});

/**
 * Change password input validator
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordValidation,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

/**
 * Reset password input validator
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordValidation,
});

/**
 * Forgot password input validator
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});



/**
 * Type exports for use in TypeScript
 */
export type UserSchemaInput = z.infer<typeof userSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type AddressInput = z.infer<typeof addressSchema>