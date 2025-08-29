import Address from '@/models/address/address.model.js';
import { IAddressDocument } from '@/models/address/address.types.js';
import { ICreateAddressData, IUpdateAddressData, IAddressQuery, AddressType } from '@/models/address/address.types.js';
import ApiError from '@utils/ApiError.js';
import logger from '@config/logger.js';

/**
 * Address service class
 */
class AddressService {
  /**
   * Create a new address
   */
  async createAddress(data: ICreateAddressData): Promise<IAddressDocument> {
    try {
      // If this address is being set as default, unset other default addresses of the same type
      if (data.isDefault) {
        await Address.updateMany(
          {
            userId: data.userId,
            type: data.type,
            isDefault: true,
            isActive: true,
          },
          { isDefault: false }
        );
      }

      const address = new Address(data);
      await address.save();

      logger.info(`Address created successfully for user ${data.userId}`, {
        addressId: address._id,
        userId: data.userId,
        type: data.type,
      });

      return address;
    } catch (error) {
      logger.error('Error creating address:', error);
      throw new ApiError('Failed to create address', 500);
    }
  }

  /**
   * Get address by ID
   */
  async getAddressById(addressId: string, userId: string): Promise<IAddressDocument> {
    try {
      const address = await Address.findOne({
        _id: addressId,
        userId,
        isActive: true,
      });

      if (!address) {
        throw new ApiError('Address not found', 404);
      }

      return address;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting address by ID:', error);
      throw new ApiError('Failed to get address', 500);
    }
  }

  /**
   * Get addresses by user ID with pagination and filtering
   */
  async getAddressesByUserId(
    userId: string,
    query: IAddressQuery
  ): Promise<{ addresses: IAddressDocument[]; total: number; page: number; totalPages: number }> {
    try {
      const { type, isDefault, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

      // Build filter
      const filter: any = { userId, isActive: true };
      if (type) filter.type = type;
      if (typeof isDefault === 'boolean') filter.isDefault = isDefault;

      // Add search functionality
      if (search) {
        filter.$text = { $search: search };
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [addresses, total] = await Promise.all([
        Address.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Address.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        addresses,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting addresses by user ID:', error);
      throw new ApiError('Failed to get addresses', 500);
    }
  }

  /**
   * Update address
   */
  async updateAddress(
    addressId: string,
    userId: string,
    data: IUpdateAddressData
  ): Promise<IAddressDocument> {
    try {
      const address = await this.getAddressById(addressId, userId);

      // If updating to default, handle default logic
      if (data.isDefault && !address.isDefault) {
        await Address.updateMany(
          {
            userId,
            type: data.type || address.type,
            _id: { $ne: addressId },
            isDefault: true,
            isActive: true,
          },
          { isDefault: false }
        );
      }

      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updatedAddress) {
        throw new ApiError('Address not found', 404);
      }

      logger.info(`Address updated successfully`, {
        addressId,
        userId,
        updatedFields: Object.keys(data),
      });

      return updatedAddress;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating address:', error);
      throw new ApiError('Failed to update address', 500);
    }
  }

  /**
   * Delete address (soft delete)
   */
  async deleteAddress(addressId: string, userId: string): Promise<void> {
    try {
      const address = await this.getAddressById(addressId, userId);

      // If this is the default address, we can't delete it
      if (address.isDefault) {
        throw new ApiError('Cannot delete default address. Please set another address as default first.', 400);
      }

      // Soft delete by setting isActive to false
      await Address.findByIdAndUpdate(addressId, { isActive: false });

      logger.info(`Address deleted successfully`, {
        addressId,
        userId,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting address:', error);
      throw new ApiError('Failed to delete address', 500);
    }
  }

  /**
   * Set address as default
   */
  async setDefaultAddress(addressId: string, userId: string, type?: AddressType): Promise<void> {
    try {
      const address = await this.getAddressById(addressId, userId);

      // Unset other default addresses of the same type
      const filter: any = { userId, isDefault: true, isActive: true };
      if (type) {
        filter.type = type;
      } else {
        filter.type = address.type;
      }

      await Address.updateMany(
        { ...filter, _id: { $ne: addressId } },
        { isDefault: false }
      );

      // Set this address as default
      await Address.findByIdAndUpdate(addressId, { isDefault: true });

      logger.info(`Address set as default successfully`, {
        addressId,
        userId,
        type: type || address.type,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error setting default address:', error);
      throw new ApiError('Failed to set default address', 500);
    }
  }

  /**
   * Get default address by user ID and type
   */
  async getDefaultAddress(userId: string, type?: AddressType): Promise<IAddressDocument | null> {
    try {
      const filter: any = { userId, isDefault: true, isActive: true };
      if (type) {
        filter.type = type;
      }

      return await Address.findOne(filter);
    } catch (error) {
      logger.error('Error getting default address:', error);
      throw new ApiError('Failed to get default address', 500);
    }
  }

  /**
   * Search addresses
   */
  async searchAddresses(
    query: string,
    userId: string,
    type?: AddressType,
    limit: number = 10
  ): Promise<IAddressDocument[]> {
    try {
      const filter: any = {
        userId,
        isActive: true,
        $text: { $search: query },
      };

      if (type) {
        filter.type = type;
      }

      return await Address.find(filter)
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('Error searching addresses:', error);
      throw new ApiError('Failed to search addresses', 500);
    }
  }

  /**
   * Bulk operations on addresses
   */
  async bulkOperations(
    addressIds: string[],
    userId: string,
    operation: 'activate' | 'deactivate' | 'delete'
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const addressId of addressIds) {
        try {
          switch (operation) {
            case 'activate':
              await Address.findOneAndUpdate(
                { _id: addressId, userId, isActive: false },
                { isActive: true }
              );
              break;
            case 'deactivate':
              await Address.findOneAndUpdate(
                { _id: addressId, userId, isActive: true },
                { isActive: false }
              );
              break;
            case 'delete':
              await Address.findOneAndUpdate(
                { _id: addressId, userId },
                { isActive: false }
              );
              break;
          }
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Address ${addressId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      logger.info(`Bulk operation completed`, {
        operation,
        userId,
        total: addressIds.length,
        success: results.success,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      logger.error('Error in bulk operations:', error);
      throw new ApiError('Failed to perform bulk operations', 500);
    }
  }

  /**
   * Get address statistics
   */
  async getAddressStatistics(userId: string, type?: AddressType): Promise<any> {
    try {
      const filter: any = { userId, isActive: true };
      if (type) filter.type = type;

      const [total, defaultCount, typeStats] = await Promise.all([
        Address.countDocuments(filter),
        Address.countDocuments({ ...filter, isDefault: true }),
        Address.aggregate([
          { $match: filter },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              defaultCount: {
                $sum: { $cond: ['$isDefault', 1, 0] },
              },
            },
          },
        ]),
      ]);

      return {
        total,
        defaultCount,
        typeStats,
        averagePerUser: total,
      };
    } catch (error) {
      logger.error('Error getting address statistics:', error);
      throw new ApiError('Failed to get address statistics', 500);
    }
  }
}

export default new AddressService();
