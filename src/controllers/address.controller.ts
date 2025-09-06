import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { validate, validateRequest } from '@/middlewares/validation.middleware.js';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import AddressModel from '@models/address/address.model.js';
import UserModel from '@models/user/user.model.js';
import {
  createAddressSchema,
  updateAddressSchema,
  getAddressSchema,
  deleteAddressSchema,
  setDefaultAddressSchema,
} from '@models/address/address.validators.js';
import { ICreateAddressData, IUpdateAddressData } from '@models/address/address.types.js';



export const createAddress = [
  validate(createAddressSchema.shape.body, 'body'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const addressData: ICreateAddressData = req.body;
    // Check if user already has addresses
    const existingAddresses = await AddressModel.find({ userId: userId, isActive: true });
    
    // If this is the first address or isDefault is true, set it as default
    const isDefault = addressData.isDefault || existingAddresses.length === 0;

    // If setting as default, unset other defaults of the same type
    if (isDefault && existingAddresses.length > 0) {
      await AddressModel.updateMany(
        { 
          user: userId, 
          type: addressData.type || 'other',
          isActive: true
        },
        { $set: { isDefault: false } }
      );
    }
    const address = await AddressModel.create({
      ...addressData,
      userId: userId,
      isDefault,
    });

    return ApiResponse.created(res, address, 'Address added successfully');
  }),
];

export const getUserAddresses = [
  // Skip validation for query params due to read-only issue
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const { includeInactive, type, isDefault } = req.query as { 
      includeInactive?: string;
      type?: string;
      isDefault?: string;
    };

    let query: any = { userId: userId };
    
    if (includeInactive !== 'true') {
      query.isActive = true;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (isDefault === 'true') {
      query.isDefault = true;
    }
    const addresses = await AddressModel.find(query).sort({ isDefault: -1, createdAt: -1 });
    
    return ApiResponse.success(res, addresses, 'Addresses fetched successfully');
  }),
];

export const getAddress = [
  validate(getAddressSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const addressId = new Types.ObjectId(req.params['id']);

    const address = await AddressModel.findOne({
      _id: addressId,
      userId: userId,
      isActive: true
    });

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    return ApiResponse.success(res, address, 'Address fetched successfully');
  }),
];

export const updateAddress = [
  validateRequest({
    params: updateAddressSchema.shape.params,
    body: updateAddressSchema.shape.body,
  }),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const addressId = new Types.ObjectId(req.params['id']);
    const updateData: IUpdateAddressData = req.body;

    const address = await AddressModel.findOne({
      _id: addressId,
      userId: userId,
      isActive: true
    });

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    // If setting as default, unset other defaults of the same type
    if (updateData.isDefault === true) {
      await AddressModel.updateMany(
        { 
          user: userId, 
          type: updateData.type || address.type,
          _id: { $ne: addressId },
          isActive: true
        },
        { $set: { isDefault: false } }
      );

      // Update user's currentLocationId to this address
      await UserModel.findByIdAndUpdate(
        req.user?.id,
        { currentLocationId: addressId }
      );
    }

    Object.assign(address, updateData);
    await address.save();

    return ApiResponse.success(res, address, 'Address updated successfully');
  }),
];

export const deleteAddress = [
  validate(deleteAddressSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
       const userId = new Types.ObjectId(req.user?.id);
    const addressId = new Types.ObjectId(req.params['id']);

    const address = await AddressModel.findOne({
      _id: addressId,
      userId: userId,
      isActive: true
    });

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

   await AddressModel.deleteOne({_id: addressId, userId: userId, isActive: true});
  
    // If this was the default address, set another as default
    if (address.isDefault) {
      const otherAddress = await AddressModel.findOne({
        userId: userId,
        isActive: true,
        type: address.type,
        _id: { $ne: addressId },
      }).sort({ createdAt: -1 });

      if (otherAddress) {
        otherAddress.isDefault = true;
        await otherAddress.save();
        
        // Update user's currentLocationId to the new default address
        const UserModel = require('@models/user/user.model.js').default;
        await UserModel.findByIdAndUpdate(
          req.user?.id,
          { currentLocationId: otherAddress._id }
        );
      } else {
        // No other address, clear currentLocationId
        const UserModel = require('@models/user/user.model.js').default;
        await UserModel.findByIdAndUpdate(
          req.user?.id,
          { $unset: { currentLocationId: 1 } }
        );
      }
    }

    return ApiResponse.success(res, null, 'Address deleted successfully');
  }),
];

export const setDefaultAddress = [
  validate(setDefaultAddressSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const addressId = new Types.ObjectId(req.params['id']);

    const address = await AddressModel.findOne({
      _id: addressId,
      userId: userId,
      isActive: true
    });

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    // Unset other defaults of the same type
    await AddressModel.updateMany(
      { 
        userId: userId,
        type: address.type,
        _id: { $ne: addressId },
        isActive: true
      },
      { $set: { isDefault: false } }
    );

    // Set this address as default
    address.isDefault = true;
    const resdd = await address.save();
    console.log('resdd', resdd)

    // Update user's currentLocationId to this address
    const UserModel = require('@models/user/user.model.js').default;
    await UserModel.findByIdAndUpdate(
      req.user?.id,
      { currentLocationId: addressId }
    );

    return ApiResponse.success(res, address, 'Default address updated successfully');
  }),
];

export const getDefaultAddress = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const { type } = req.query as { type?: string };

    let query: any = { 
      userId: userId, 
      isDefault: true,
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const defaultAddress = await AddressModel.findOne(query);

    if (!defaultAddress) {
      return ApiResponse.success(res, null, 'No default address found');
    }

    return ApiResponse.success(res, defaultAddress, 'Default address fetched successfully');
  }),
];

export const getAddressStatistics = [
  catchAsync(async (req: Request, res: Response) => {
       const userId = new Types.ObjectId(req.user?.id);

    const totalAddresses = await AddressModel.countDocuments({ 
      userId: userId, 
      isActive: true 
    });

    const addressesByType = await AddressModel.aggregate([
      { 
        $match: { 
          userId: new Types.ObjectId(userId), 
          isActive: true 
        } 
      },
      { 
        $group: { 
          _id: '$type', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const defaultAddresses = await AddressModel.countDocuments({
      userId: userId,
      isActive: true,
      isDefault: true
    });

    const stats = {
      total: totalAddresses,
      defaults: defaultAddresses,
      byType: addressesByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>)
    };

    return ApiResponse.success(res, stats, 'Address statistics fetched successfully');
  }),
];

export const validateAddressOwnership = [
  validate(getAddressSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
       const userId = new Types.ObjectId(req.user?.id);
    const addressId = new Types.ObjectId(req.params['id']);

    const address = await AddressModel.findOne({
      _id: addressId,
      userId: userId,
      isActive: true
    });

    const isOwner = !!address;

    return ApiResponse.success(res, { isOwner }, 'Ownership validation completed');
  }),
];