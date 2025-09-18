// @ts-nocheck
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '@models/user/user.model.js';
import { IUser } from '@models/user/user.types.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import catchAsync from '@utils/catchAsync.js';
import logger from '@config/logger.js';
import { formatUserResponse } from '../auth/auth.controller';
import userService from '@services/user.service.js';
import emailService from '@services/email.service.js';

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



  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: formatUserResponse(updatedUser),
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
      user: formatUserResponse(user),
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

/**
 * Get all users with filters
 */
export const getUsers = [

  catchAsync(async (req: Request, res: Response) => {
    const filters = req.query as any;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const result = await userService.getUsers(filters, userId, userRole);
    
    // Create a custom response with both pagination and stats
    return res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      data: result.users,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        pagination: result.pagination,
        stats: result.stats,
      },
    });
  })
];

/**
 * Get user by ID
 */
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  const user = await userService.getUserById(userId);
  
  return ApiResponse.success(
    res,
    user,
    'User retrieved successfully'
  );
});

/**
 * Block user
 */
export const blockUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  const user = await userService.blockUser(userId);
  
  // Send email notification to the blocked user
  try {
    if (user.email) {
      const userName = user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'User';
      const accountType = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
      
      await emailService.sendAccountBlockedEmail(
        user.email,
        userName,
        accountType,
        'Your account has been temporarily blocked due to policy violations. Please contact support for more information.'
      );
      
      logger.info('Block notification email sent', { userId, email: user.email });
    }
  } catch (emailError) {
    // Log error but don't fail the operation
    logger.error('Failed to send block notification email', { error: emailError, userId });
  }
  
  return ApiResponse.success(
    res,
    user,
    'User blocked successfully'
  );
});

/**
 * Unblock user
 */
export const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  const user = await userService.unblockUser(userId);
  
  // Send email notification to the unblocked user
  try {
    if (user.email) {
      const userName = user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'User';
      const accountType = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
      
      await emailService.sendAccountUnblockedEmail(
        user.email,
        userName,
        accountType
      );
      
      logger.info('Unblock notification email sent', { userId, email: user.email });
    }
  } catch (emailError) {
    // Log error but don't fail the operation
    logger.error('Failed to send unblock notification email', { error: emailError, userId });
  }
  
  return ApiResponse.success(
    res,
    user,
    'User unblocked successfully'
  );
});

/**
 * Delete user (soft delete)
 */
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  // Get user details before deletion for email
  const user = await User.findById(userId);
  
  if (user && user.email) {
    const userName = user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'User';
    const accountType = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
    
    // Perform the deletion
    const result = await userService.softDeleteUser(userId);
    
    // Send email notification about account deletion
    try {
      await emailService.sendAccountDeletedEmail(
        user.email,
        userName,
        accountType,
        'Account deleted as per administrative action'
      );
      
      logger.info('Deletion notification email sent', { userId, email: user.email });
    } catch (emailError) {
      // Log error but don't fail the operation
      logger.error('Failed to send deletion notification email', { error: emailError, userId });
    }
    
    return ApiResponse.success(
      res,
      result,
      result.message
    );
  } else {
    // If user not found, still try to delete (might be partially deleted)
    const result = await userService.softDeleteUser(userId);
    
    return ApiResponse.success(
      res,
      result,
      result.message
    );
  }
});

/**
 * Restore deleted user
 */
export const restoreUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  const user = await userService.restoreUser(userId);
  
  return ApiResponse.success(
    res,
    user,
    'User restored successfully'
  );
});

export default {
  updateProfile,
  getProfile,
  updateCurrentLocation,
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  deleteUser,
  restoreUser,
};