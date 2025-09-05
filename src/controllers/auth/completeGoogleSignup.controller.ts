import { Request, Response } from 'express';
import { z } from 'zod';
import catchAsync from '@utils/catchAsync.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import UserModel from '@/models/user/user.model.js';
import { UserRole, UserStatus } from '@/models/user/user.types.js';
import logger from '@config/logger.js';
import { formatUserResponse } from './auth.controller';

// Validation schemas for each role
const buyerSchema = z.object({
  userId: z.string(),
  role: z.literal('buyer'),
});

const driverSchema = z.object({
  userId: z.string(),
  role: z.literal('driver'),
  phone: z.string().min(10).max(15),
});

const sellerSchema = z.object({
  userId: z.string(),
  role: z.literal('seller'),
  businessName: z.string().min(2),
  businessAddress: z.string().min(5),
  phone: z.string().min(10).max(15),
  cellPhone: z.string().optional(),
  einNumber: z.string().min(1),
  localDelivery: z.boolean(),
  salesTaxId: z.string().optional(),
});

// Combined schema using discriminated union
const completeGoogleSignupSchema = z.discriminatedUnion('role', [
  buyerSchema,
  driverSchema,
  sellerSchema,
]);

export const completeGoogleSignup = catchAsync(async (req: Request, res: Response) => {
  // Validate request body
  let validatedData;
  try {
    validatedData = completeGoogleSignupSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw ApiError.validationError('Validation failed', formattedErrors);
    }
    throw error;
  }

  const { userId, role } = validatedData;

  // Find the user
  const user = await UserModel.findById(userId);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Check if user already has a role
  if (user.role && user.role !== UserRole.BUYER && user.role !== UserRole.SELLER && user.role !== UserRole.DRIVER) {
    throw ApiError.badRequest('User already has a role assigned');
  }

  // Update user based on role
  user.role = role as UserRole;

  // Get existing avatar from profile if it exists
  const existingAvatar = (user.profile as any)?.avatar;

  // Set role-specific fields
  if (role === 'driver' && 'phone' in validatedData) {
    const driverProfile: any = {
      role: UserRole.DRIVER,
      phone: validatedData.phone,
      driverLicense: {
        number: '',
        verified: false,
        licenceImages: [],
      },
      vehicles: [],
      addresses: [],
      avatar: existingAvatar, // Preserve avatar
    };
    user.profile = driverProfile;
  } else if (role === 'seller' && 'businessName' in validatedData) {
    const sellerProfile: any = {
      role: UserRole.SELLER,
      phone: validatedData.phone,
      cellPhone: validatedData.cellPhone,
      businessName: validatedData.businessName,
      businessAddress: validatedData.businessAddress,
      einNumber: validatedData.einNumber,
      salesTaxId: validatedData.salesTaxId,
      localDelivery: validatedData.localDelivery,
      addresses: [],
      avatar: existingAvatar, // Preserve avatar
    };
    user.profile = sellerProfile;
  } else if (role === 'buyer') {
    const buyerProfile: any = {
      role: UserRole.BUYER,
      addresses: [],
      avatar: existingAvatar, // Preserve avatar
    };
    user.profile = buyerProfile;
  }

  // Mark user as verified since they authenticated with Google
  user.auth = {
    ...user.auth,
    emailVerifiedAt: new Date(),
  };
  user.status = UserStatus.ACTIVE;

  // Save the updated user
  await user.save();

  // Generate tokens
  const tokens = {
    accessToken: user.generateAccessToken(),
    refreshToken: user.generateRefreshToken(),
    expiresIn: 900, // 15 minutes
  };

  // Add refresh token to user
  await user.addRefreshToken(tokens.refreshToken);

  logger.info('Google signup completed', {
    userId: user._id,
    role: user.role,
  });

  return ApiResponse.success(
    res,
    {
      user: formatUserResponse(user.toJSON()),
      tokens,
    },
    'Account setup completed successfully'
  );
});

export default {
  completeGoogleSignup,
};