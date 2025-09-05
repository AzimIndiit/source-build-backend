// @ts-nocheck
import { Request, Response } from 'express';
import mongoose from 'mongoose';
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

  // Extract all possible update fields from request body
  const {
    firstName,
    lastName,
    businessName,
    businessAddress,
    region,
    address,
    description,
    avatar,
    phone,
    cellPhone,
    einNumber,
    salesTaxId,
    localDelivery,
  } = req.body;

  // Build update object for direct user fields
  const updateData: any = {};
  const profileUpdateData: any = {};

  // Update direct user fields
  if (firstName !== undefined) {
    updateData.firstName = firstName;
    profileUpdateData.firstName = firstName;
  }
  if (lastName !== undefined) {
    updateData.lastName = lastName;
    profileUpdateData.lastName = lastName;
  }
  
  // Build displayName if names are updated
  if (firstName !== undefined || lastName !== undefined) {
    const newFirstName = firstName !== undefined ? firstName : user.firstName;
    const newLastName = lastName !== undefined ? lastName : user.lastName;
    updateData.displayName = `${newFirstName || ''} ${newLastName || ''}`.trim();
    profileUpdateData.displayName = updateData.displayName;
  }

  // Common profile fields
  if (description !== undefined) profileUpdateData.description = description;
  if (region !== undefined) profileUpdateData.region = region;
  if (address !== undefined) profileUpdateData.address = address;
  if (avatar !== undefined) profileUpdateData.avatar = avatar;
  if (phone !== undefined) profileUpdateData.phone = phone;

  // Role-specific fields for sellers
  if (user.role === 'seller') {
    if (businessName !== undefined) profileUpdateData.businessName = businessName;
    if (businessAddress !== undefined) profileUpdateData.businessAddress = businessAddress;
    if (cellPhone !== undefined) profileUpdateData.cellPhone = cellPhone;
    if (einNumber !== undefined) profileUpdateData.einNumber = einNumber;
    if (salesTaxId !== undefined) profileUpdateData.salesTaxId = salesTaxId;
    if (localDelivery !== undefined) profileUpdateData.localDelivery = localDelivery;
  }

  // Role-specific fields for drivers
  if (user.role === 'driver') {
    if (phone !== undefined) profileUpdateData.phone = phone;
  }

  // Prepare the final update object
  const finalUpdateData: any = { ...updateData };
  
  // Add profile updates with dot notation
  Object.keys(profileUpdateData).forEach(key => {
    finalUpdateData[`profile.${key}`] = profileUpdateData[key];
  });

  // Log the update data for debugging
  logger.info('Updating user profile', { 
    userId, 
    updateFields: Object.keys(finalUpdateData),
    updateData: finalUpdateData 
  });

  // Update user in database
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: finalUpdateData },
    { 
      new: true, 
      runValidators: true,
      upsert: false 
    }
  ).select('-password -refreshTokens');

  if (!updatedUser) {
    throw ApiError.notFound('User not found');
  }

  logger.info('User profile updated successfully', { 
    userId, 
    updatedFields: Object.keys(finalUpdateData) 
  });

  // Format response using the formatUserResponse helper from auth controller
  const userResponse = {
    id: updatedUser._id,
    email: updatedUser.email,
    firstName: updatedUser.firstName || updatedUser.profile?.firstName,
    lastName: updatedUser.lastName || updatedUser.profile?.lastName,
    displayName: updatedUser.displayName || `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
    role: updatedUser.role,
    isVerified: updatedUser.isVerified || updatedUser.isEmailVerified,
    avatar: updatedUser.profile?.avatar,
    region: updatedUser.profile?.region,
    address: updatedUser.profile?.address,
    description: updatedUser.profile?.description,
    phone: updatedUser.profile?.phone,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };

  // Add seller-specific fields to response
  if (updatedUser.role === 'seller') {
    userResponse.businessName = updatedUser.profile?.businessName;
    userResponse.businessAddress = updatedUser.profile?.businessAddress;
    userResponse.cellPhone = updatedUser.profile?.cellPhone;
    userResponse.einNumber = updatedUser.profile?.einNumber;
    userResponse.salesTaxId = updatedUser.profile?.salesTaxId;
    userResponse.localDelivery = updatedUser.profile?.localDelivery;
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: userResponse,
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

  // Format user response
  const userResponse: any = {
    id: user._id,
    email: user.email,
    firstName: user.firstName || user.profile?.firstName,
    lastName: user.lastName || user.profile?.lastName,
    displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    role: user.role,
    isVerified: user.isVerified || user.isEmailVerified,
    avatar: user.profile?.avatar,
    region: user.profile?.region,
    address: user.profile?.address,
    description: user.profile?.description,
    phone: user.profile?.phone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  // Add seller-specific fields
  if (user.role === 'seller') {
    userResponse.businessName = user.profile?.businessName;
    userResponse.businessAddress = user.profile?.businessAddress;
    userResponse.cellPhone = user.profile?.cellPhone;
    userResponse.einNumber = user.profile?.einNumber;
    userResponse.salesTaxId = user.profile?.salesTaxId;
    userResponse.localDelivery = user.profile?.localDelivery;
  }

  // Add driver-specific fields
  if (user.role === 'driver') {
    userResponse.isVehicles = user.profile?.isVehicles;
    userResponse.isLicense = user.profile?.isLicense;
  }

  res.status(200).json({
    success: true,
    data: {
      user: userResponse,
    },
  });
});

/**
 * Update user's current location
 */
export const updateCurrentLocation = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { locationId } = req.body;

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Validate locationId
  if (!locationId) {
    // Clear current location if no locationId provided
    await User.findByIdAndUpdate(
      userId,
      { $unset: { currentLocationId: 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Current location cleared successfully',
      data: {
        currentLocationId: null,
        currentLocation: null,
      },
    });
  }

  // Verify the address exists and belongs to the user
  const AddressModel = mongoose.model('Address');
  const address = await AddressModel.findOne({ 
    _id: locationId, 
    userId: userId 
  });

  if (!address) {
    throw ApiError.badRequest('Invalid location ID or address does not belong to user');
  }

  // Update user's current location
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { currentLocationId: locationId },
    { new: true }
  ).populate('currentLocationId');

  if (!updatedUser) {
    throw ApiError.notFound('User not found');
  }

  logger.info('User current location updated', { 
    userId, 
    locationId 
  });

  res.status(200).json({
    success: true,
    message: 'Current location updated successfully',
    data: {
      currentLocationId: updatedUser.currentLocationId,
      currentLocation: (updatedUser as any).currentLocationId,
    },
  });
});

export default {
  updateProfile,
  getProfile,
  updateCurrentLocation,
};