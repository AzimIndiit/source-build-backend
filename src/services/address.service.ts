import { Types } from 'mongoose';
import Address from '@models/address/address.model.js';
import { 
  IAddress, 
  ICreateAddressData, 
  IUpdateAddressData, 
  IAddressQuery,
  AddressType 
} from '@models/address/address.types.js';
import ApiError from '@utils/ApiError.js';

export class AddressService {
  /**
   * Create a new address
   */
  static async create(data: ICreateAddressData): Promise<IAddress> {
    // Debug logging
    console.log('=== ADDRESS SERVICE CREATE DEBUG ===');
    console.log('Received data:', data);
    console.log('data.userId:', data.userId);
    console.log('data.type:', data.type);
    
    if (!data.userId) {
      console.error('ERROR: No userId in data passed to service!');
      throw new ApiError('User ID is required', 400);
    }
    
    // If this is the first address or marked as default, ensure it's the only default
    const existingAddresses = await Address.find({ 
      userId: data.userId, 
      type: data.type,
      isActive: true 
    });

    if (existingAddresses.length === 0 || data.isDefault) {
      // If first address or explicitly set as default, make it default
      data.isDefault = true;
      // Unset other defaults
      if (existingAddresses.length > 0) {
        await Address.updateMany(
          { 
            userId: data.userId, 
            type: data.type,
            isDefault: true 
          },
          { isDefault: false }
        );
      }
    }

    console.log('Creating address with data:', data);
    const address = await Address.create(data);
    console.log('Address created successfully:', address.toObject());
    console.log('=== END ADDRESS SERVICE DEBUG ===');
    return address.toObject();
  }

  /**
   * Get all addresses for a user
   */
  static async getUserAddresses(userId: string, query?: IAddressQuery): Promise<{
    addresses: IAddress[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = { userId, isActive: true };
    
    if (query?.type) {
      filter.type = query.type;
    }
    
    if (query?.isDefault !== undefined) {
      filter.isDefault = query.isDefault;
    }
    
    if (query?.search) {
      filter.$text = { $search: query.search };
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;
    
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [addresses, total] = await Promise.all([
      Address.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Address.countDocuments(filter)
    ]);

    return {
      addresses: addresses as IAddress[],
      total,
      page,
      limit
    };
  }

  /**
   * Get a single address by ID
   */
  static async getById(addressId: string, userId: string): Promise<IAddress> {
    const address = await Address.findOne({ 
      _id: addressId, 
      userId,
      isActive: true 
    }).lean();

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    return address as IAddress;
  }

  /**
   * Update an address
   */
  static async update(
    addressId: string, 
    userId: string, 
    data: IUpdateAddressData
  ): Promise<IAddress> {
    // Check if address exists and belongs to user
    const existingAddress = await Address.findOne({ 
      _id: addressId, 
      userId,
      isActive: true 
    });

    if (!existingAddress) {
      throw new ApiError(404, 'Address not found');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await Address.updateMany(
        { 
          userId, 
          type: data.type || existingAddress.type,
          _id: { $ne: addressId },
          isDefault: true 
        },
        { isDefault: false }
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      data,
      { new: true, runValidators: true }
    ).lean();

    return updatedAddress as IAddress;
  }

  /**
   * Delete an address (soft delete)
   */
  static async delete(addressId: string, userId: string): Promise<void> {
    const address = await Address.findOne({ 
      _id: addressId, 
      userId,
      isActive: true 
    });

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    // If deleting default address, set another as default
    if (address.isDefault) {
      const nextDefault = await Address.findOne({
        userId,
        type: address.type,
        _id: { $ne: addressId },
        isActive: true
      }).sort({ createdAt: -1 });

      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    // Soft delete
    address.isActive = false;
    await address.save();
  }

  /**
   * Set an address as default
   */
  static async setDefault(addressId: string, userId: string): Promise<IAddress> {
    const address = await Address.findOne({ 
      _id: addressId, 
      userId,
      isActive: true 
    });

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    // Unset other defaults of the same type
    await Address.updateMany(
      { 
        userId, 
        type: address.type,
        _id: { $ne: addressId },
        isDefault: true 
      },
      { isDefault: false }
    );

    // Set this as default
    address.isDefault = true;
    await address.save();

    return address.toObject();
  }

  /**
   * Get default address for a user
   */
  static async getDefaultAddress(
    userId: string, 
    type?: AddressType
  ): Promise<IAddress | null> {
    const filter: any = { 
      userId, 
      isDefault: true, 
      isActive: true 
    };
    
    if (type) {
      filter.type = type;
    }

    const address = await Address.findOne(filter).lean();
    return address as IAddress | null;
  }

  /**
   * Validate if an address belongs to a user
   */
  static async validateOwnership(
    addressId: string, 
    userId: string
  ): Promise<boolean> {
    const address = await Address.findOne({ 
      _id: addressId, 
      userId,
      isActive: true 
    });
    
    return !!address;
  }

  /**
   * Bulk delete addresses
   */
  static async bulkDelete(
    addressIds: string[], 
    userId: string
  ): Promise<{ deleted: number }> {
    const result = await Address.updateMany(
      { 
        _id: { $in: addressIds },
        userId,
        isActive: true
      },
      { isActive: false }
    );

    // Check if any default addresses were deleted and reassign
    const remainingDefaults = await Address.find({
      userId,
      isDefault: true,
      isActive: true
    });

    if (remainingDefaults.length === 0) {
      // Set the most recent address as default for each type
      const types = Object.values(AddressType);
      for (const type of types) {
        const latestAddress = await Address.findOne({
          userId,
          type,
          isActive: true
        }).sort({ createdAt: -1 });

        if (latestAddress) {
          latestAddress.isDefault = true;
          await latestAddress.save();
        }
      }
    }

    return { deleted: result.modifiedCount };
  }

  /**
   * Get address statistics for a user
   */
  static async getStatistics(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    defaultAddresses: Record<string, boolean>;
  }> {
    const addresses = await Address.find({ 
      userId, 
      isActive: true 
    }).lean();

    const stats = {
      total: addresses.length,
      byType: {} as Record<string, number>,
      defaultAddresses: {} as Record<string, boolean>
    };

    for (const address of addresses) {
      // Count by type
      stats.byType[address.type] = (stats.byType[address.type] || 0) + 1;
      
      // Track default addresses
      if (address.isDefault) {
        stats.defaultAddresses[address.type] = true;
      }
    }

    return stats;
  }
}