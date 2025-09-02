// @ts-nocheck
import { Request, Response } from 'express';
import User from '@models/user/user.model.js';
import { IUser } from '@models/user/user.types.js';
import ApiError from '@utils/ApiError.js';
import catchAsync from '@utils/catchAsync.js';
import logger from '@config/logger.js';

/**
 * Update user profile
 */
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Extract update fields from request body
  const {
    firstName,
    lastName,
    company,
    businessName,
    region,
    address,
    businessAddress,
    description,
    avatar,
    phone,
  } = req.body;

  // Build update object based on user role
  const updateData: any = {};

  // Common fields for all users
  if (firstName !== undefined) updateData['profile.firstName'] = firstName;
  if (lastName !== undefined) updateData['profile.lastName'] = lastName;
  if (description !== undefined) updateData['profile.description'] = description;
  if (avatar !== undefined) updateData['profile.avatar'] = avatar;
  if (phone !== undefined) updateData['profile.phone'] = phone;

  // Role-specific fields
  if (user.role === 'seller') {
    if (businessName !== undefined) updateData['profile.businessName'] = businessName;
    if (businessAddress !== undefined) updateData['profile.businessAddress'] = businessAddress;
  }

  // Common additional fields
  if (company !== undefined) updateData['profile.company'] = company;
  if (region !== undefined) updateData['profile.region'] = region;
  if (address !== undefined) updateData['profile.address'] = address;

  // Update user in database
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-auth.password -auth.refreshTokens');

  if (!updatedUser) {
    throw ApiError.notFound('User not found');
  }

  logger.info('User profile updated', { userId, updates: Object.keys(updateData) });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.profile?.firstName,
        lastName: updatedUser.profile?.lastName,
        displayName: updatedUser.profile?.displayName,
        role: updatedUser.role,
        isVerified: !!updatedUser.auth?.emailVerifiedAt,
        company: updatedUser.profile?.company,
        businessName: updatedUser.profile?.businessName,
        region: updatedUser.profile?.region,
        address: updatedUser.profile?.address,
        businessAddress: updatedUser.profile?.businessAddress,
        description: updatedUser.profile?.description,
        avatar: updatedUser.profile?.avatar,
        phone: updatedUser.profile?.phone,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    },
  });
});

/**
 * Get user profile
 */
export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        displayName: user.profile?.displayName,
        role: user.role,
        isVerified: !!user.auth?.emailVerifiedAt,
        company: user.profile?.company,
        businessName: user.profile?.businessName,
        region: user.profile?.region,
        address: user.profile?.address,
        businessAddress: user.profile?.businessAddress,
        description: user.profile?.description,
        avatar: user.profile?.avatar,
        phone: user.profile?.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});

export default {
  updateProfile,
  getProfile,
};