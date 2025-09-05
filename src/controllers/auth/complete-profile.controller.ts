import { Request, Response } from 'express';
import { z } from 'zod';
import User from '@/models/user/user.model.js';
import { UserRole, UserStatus } from '@/models/user/user.types.js';
import ApiError from '@/utils/ApiError.js';
import ApiResponse from '@/utils/ApiResponse.js';
import catchAsync from '@/utils/catchAsync.js';
import logger from '@/config/logger.js';
import { formatUserResponse } from './auth.controller';

/**
 * Validation schemas for completing profile
 */
const completeSellerProfileSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  einNumber: z.string().min(1, 'EIN number is required'),
  salesTaxId: z.string().min(1, 'Sales Tax ID is required'),
  businessAddress: z.string().optional(),
  localDelivery: z.boolean().optional().default(false),
});

const completeDriverProfileSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
   vehicles: z.array(z.object({
    make: z.string(),
    model: z.string(),
    vehicleImages: z.array(z.string()),
    insuranceImages: z.array(z.string()),
    registrationNumber: z.string(),
   })),
   driverLicense: z.object({
    number: z.string(),
    licenceImages: z.array(z.string()),
    verified: z.boolean().optional().default(false),
   })
});

const completeBuyerProfileSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

/**
 * Complete profile for Google OAuth users
 */
export const completeProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    
    if (user.authType !== 'google') {
      throw ApiError.badRequest('This endpoint is only for Google OAuth users');
    }
    
    logger.info('Complete profile attempt', { 
      userId: user._id,
      role: user.role 
    });
    
    // Validate based on role
    let validatedData: any;
    
    try {
      switch (user.role) {
        case UserRole.SELLER:
          validatedData = await completeSellerProfileSchema.parseAsync(req.body);
          
          // Check for duplicate EIN
          const existingEIN = await User.findOne({ 
            'profile.einNumber': validatedData.einNumber,
            _id: { $ne: userId }
          });
          if (existingEIN) {
            throw ApiError.conflict('EIN number already registered');
          }
          
          // Update seller profile
          user.profile = {
            ...user.profile,
            ...validatedData,
            role: UserRole.SELLER,
            businessAddress: validatedData.businessAddress,

            
          } as any;
          
          user.status = UserStatus.ACTIVE;
          break;
          
        case UserRole.DRIVER:
          validatedData = await completeDriverProfileSchema.parseAsync(req.body);
          
          // Check for duplicate phone number for drivers
          const existingDriverPhone = await User.findOne({ 
            role: UserRole.DRIVER,
            'profile.phone': validatedData.phone,
            _id: { $ne: userId }
          });
          if (existingDriverPhone) {
            throw ApiError.conflict('Driver already exists with this phone number');
          }
          
          // Check for duplicate license
          const existingLicense = await User.findOne({ 
            'profile.driverLicense.number': validatedData.driverLicenseNumber,
            _id: { $ne: userId }
          });
          if (existingLicense) {
            throw ApiError.conflict('Driver license already registered');
          }
          
          // Update driver profile
          user.profile = {
            ...user.profile,
            phone: validatedData.phone,
            role: UserRole.DRIVER,
            addresses: user.profile?.addresses || [],
            driverLicense: {
              number: validatedData.driverLicenseNumber,
              licenceImages: validatedData.driverLicense.licenceImages,
              verified: false,
            },
            vehicles: validatedData.vehicles,
            
          } as any;
          
          user.status = UserStatus.ACTIVE;
          break;
          
        case UserRole.BUYER:
          validatedData = await completeBuyerProfileSchema.parseAsync(req.body);
          
          // Update buyer profile
          user.profile = {
            ...user.profile,
            ...validatedData,
            role: UserRole.BUYER,
            addresses: user.profile?.addresses || [],
            
          } as any;
          
          user.status = UserStatus.ACTIVE;
          break;
          
        default:
          throw ApiError.badRequest('Invalid user role');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw ApiError.validationError('Validation failed', formattedErrors);
      }
      throw error;
    }
    
    await user.save();
    
    logger.info('Profile completed successfully', { 
      userId: user._id,
      role: user.role 
    });
    
    return ApiResponse.success(res, {
      user: formatUserResponse(user.toJSON()),
      profileCompleted: true,
    }, 'Profile completed successfully');
});

export default {
  completeProfile,
};