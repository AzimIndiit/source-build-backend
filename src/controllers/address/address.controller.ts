import { Request, Response, NextFunction } from 'express';
import addressService from '@services/address.service.js';
import {
  createAddressSchema,
  updateAddressSchema,
  addressQuerySchema,
  setDefaultAddressSchema,
  bulkAddressOperationsSchema,
  addressSearchSchema,
  addressStatisticsSchema,
} from '@/models/address/address.validators.js';
import { validate } from '@middlewares/validation.middleware.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import catchAsync from '@utils/catchAsync.js';
import logger from '@config/logger.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       required:
 *         - userId
 *         - street
 *         - city
 *         - state
 *         - country
 *         - zipCode
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: Address ID
 *         userId:
 *           type: string
 *           description: User ID who owns this address
 *         label:
 *           type: string
 *           description: Optional label for the address
 *         street:
 *           type: string
 *           description: Street address
 *         city:
 *           type: string
 *           description: City name
 *         state:
 *           type: string
 *           description: State/province name
 *         country:
 *           type: string
 *           description: Country name
 *         zipCode:
 *           type: string
 *           description: ZIP/postal code
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default address
 *         type:
 *           type: string
 *           enum: [billing, shipping, both]
 *           description: Address type
 *         isActive:
 *           type: boolean
 *           description: Whether the address is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * Create a new address
 * @route POST /api/v1/addresses
 * @access Private
 */
export const createAddress = [
  validate(createAddressSchema.shape.body),
  catchAsync(async (req: Request, res: Response) => {
    const addressData = { ...req.body }; // Create a copy to avoid mutation
    
    // Debug logging
    console.log('=== CREATE ADDRESS DEBUG ===');
    console.log('req.user:', req.user);
    console.log('req.userId (from middleware):', (req as any).userId);
    console.log('req.body:', req.body);
    console.log('addressData before userId:', addressData);
    
    // Extract userId from middleware (it sets req.userId as a string)
    const userId = (req as any).userId || (req.user as any)?._id?.toString() || (req.user as any)?.id;
    
    console.log('Extracted userId:', userId);
    console.log('userId type:', typeof userId);
    
    if (!userId) {
      console.error('No userId found! req.user:', req.user, 'req.userId:', (req as any).userId);
      throw new ApiError('User not authenticated', 401);
    }

    // Ensure the address is created for the authenticated user
    addressData.userId = userId;
    
    console.log('addressData with userId:', addressData);
    console.log('=== END DEBUG ===');

    const address = await addressService.create(addressData);

    logger.info(`Address created successfully`, {
      addressId: address._id,
      userId,
      type: address.type,
    });

    ApiResponse.created(res, address, 'Address created successfully');
  }),
];

/**
 * Get address by ID
 * @route GET /api/v1/addresses/:id
 * @access Private
 */
export const getAddressById = [
  catchAsync(async (req: Request, res: Response) => {
    const { id: addressId } = req.params;
    const userId = (req.user as any)?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    if (!addressId) {
      throw new ApiError('Address ID is required', 400);
    }

    const address = await addressService.getById(addressId, userId);

    ApiResponse.success(res, address, 'Address retrieved successfully');
  }),
];

/**
 * Get all addresses for the authenticated user
 * @route GET /api/v1/addresses
 * @access Private
 */
export const getAddresses = [
  validate(addressQuerySchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const query = req.query;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const result = await addressService.getUserAddresses(userId, query);

    ApiResponse.success(res, result, 'Addresses retrieved successfully');
  }),
];

/**
 * Update address
 * @route PATCH /api/v1/addresses/:id
 * @access Private
 */
export const updateAddress = [
  validate(updateAddressSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id: addressId } = req.params;
    const updateData = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    if (!addressId) {
      throw new ApiError('Address ID is required', 400);
    }

    const updatedAddress = await addressService.update(
      addressId,
      userId,
      updateData
    );

    logger.info(`Address updated successfully`, {
      addressId,
      userId,
      updatedFields: Object.keys(updateData),
    });

    ApiResponse.success(res, updatedAddress, 'Address updated successfully');
  }),
];

/**
 * Delete address (soft delete)
 * @route DELETE /api/v1/addresses/:id
 * @access Private
 */
export const deleteAddress = [
  catchAsync(async (req: Request, res: Response) => {
    const { id: addressId } = req.params;
    const userId = (req.user as any)?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    if (!addressId) {
      throw new ApiError('Address ID is required', 400);
    }

    await addressService.delete(addressId, userId);

    logger.info(`Address deleted successfully`, {
      addressId,
      userId,
    });

    ApiResponse.success(res, null, 'Address deleted successfully');
  }),
];

/**
 * Set address as default
 * @route PATCH /api/v1/addresses/:id/set-default
 * @access Private
 */
export const setDefaultAddress = [
  validate(setDefaultAddressSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id: addressId } = req.params;
    const { type } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    if (!addressId) {
      throw new ApiError('Address ID is required', 400);
    }

    await addressService.setDefault(addressId, userId);

    logger.info(`Address set as default successfully`, {
      addressId,
      userId,
      type,
    });

    ApiResponse.success(res, null, 'Address set as default successfully');
  }),
];

/**
 * Get default address for the authenticated user
 * @route GET /api/v1/addresses/default
 * @access Private
 */
export const getDefaultAddress = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const { type } = req.query;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const address = await addressService.getDefaultAddress(
      userId,
      type as any
    );

    ApiResponse.success(res, address, 'Default address retrieved successfully');
  }),
];

/**
 * Search addresses
 * @route GET /api/v1/addresses/search
 * @access Private
 */
export const searchAddresses = [
  validate(addressSearchSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { query, type, limit } = req.query;
    const userId = (req.user as any)?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    // TODO: Implement searchAddresses method in AddressService
    throw new ApiError('Search functionality not yet implemented', 501);
    // const addresses = await addressService.searchAddresses(
    //   query as string,
    //   userId,
    //   type as any,
    //   limit ? Number(limit) : 10
    // );

    ApiResponse.success(res, addresses, 'Addresses found successfully');
  }),
];

/**
 * Bulk operations on addresses
 * @route PATCH /api/v1/addresses/bulk
 * @access Private
 */
export const bulkAddressOperations = [
  validate(bulkAddressOperationsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { addressIds, operation } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    // TODO: Implement full bulkOperations method in AddressService
    // For now, only delete operation is supported
    if (operation === 'delete') {
      const result = await addressService.bulkDelete(addressIds, userId);
      
      logger.info(`Bulk delete operation completed`, {
        operation,
        userId,
        total: addressIds.length,
      });
      
      ApiResponse.success(res, { deleted: result }, 'Addresses deleted successfully');
    } else {
      throw new ApiError('Operation not yet implemented', 501);
    }
  }),
];

/**
 * Get address statistics
 * @route GET /api/v1/addresses/statistics
 * @access Private
 */
export const getAddressStatistics = [
  validate(addressStatisticsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const { type } = req.query;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const statistics = await addressService.getStatistics(
      userId,
      type as any
    );

    ApiResponse.success(res, statistics, 'Address statistics retrieved successfully');
  }),
];

/**
 * Health check for address service
 * @route GET /api/v1/addresses/health
 * @access Public
 */
export const addressHealthCheck = [
  catchAsync(async (_req: Request, res: Response, _next: NextFunction) => {
    ApiResponse.success(res, {
      status: 'healthy',
      service: 'address',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }, 'Address service is healthy');
  }),
];
