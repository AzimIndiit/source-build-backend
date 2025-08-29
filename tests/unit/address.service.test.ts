import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import addressService from '@/services/address.service.js';
import Address from '@/models/address/address.model.js';
import { AddressType } from '@/models/address/address.types.js';
import ApiError from '@utils/ApiError.js';

// Mock the Address model
jest.mock('@/models/address/address.model.js');
jest.mock('@config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAddress = {
  _id: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439012',
  label: 'Home',
  street: '123 Main St',
  city: 'New York',
  state: 'NY',
  country: 'USA',
  zipCode: '10001',
  isDefault: false,
  type: AddressType.BILLING,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(mockAddress),
};

const mockAddressModel = Address as jest.Mocked<typeof Address>;

describe('AddressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAddress', () => {
    it('should create a new address successfully', async () => {
      const addressData = {
        userId: '507f1f77bcf86cd799439012',
        label: 'Home',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        isDefault: false,
        type: AddressType.BILLING,
      };

      mockAddressModel.updateMany = jest.fn().mockResolvedValue({});
      mockAddressModel.prototype.save = jest.fn().mockResolvedValue(mockAddress);

      const result = await addressService.createAddress(addressData);

      expect(result).toEqual(mockAddress);
      expect(mockAddressModel.prototype.save).toHaveBeenCalled();
    });

    it('should handle default address logic when creating default address', async () => {
      const addressData = {
        userId: '507f1f77bcf86cd799439012',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        isDefault: true,
        type: AddressType.BILLING,
      };

      mockAddressModel.updateMany = jest.fn().mockResolvedValue({});
      mockAddressModel.prototype.save = jest.fn().mockResolvedValue(mockAddress);

      await addressService.createAddress(addressData);

      expect(mockAddressModel.updateMany).toHaveBeenCalledWith(
        {
          userId: addressData.userId,
          type: addressData.type,
          isDefault: true,
          isActive: true,
        },
        { isDefault: false }
      );
    });
  });

  describe('getAddressById', () => {
    it('should return address when found', async () => {
      mockAddressModel.findOne = jest.fn().mockResolvedValue(mockAddress);

      const result = await addressService.getAddressById(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      );

      expect(result).toEqual(mockAddress);
      expect(mockAddressModel.findOne).toHaveBeenCalledWith({
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        isActive: true,
      });
    });

    it('should throw ApiError when address not found', async () => {
      mockAddressModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        addressService.getAddressById(
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012'
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getAddressesByUserId', () => {
    it('should return paginated addresses', async () => {
      const mockAddresses = [mockAddress];
      const mockCount = 1;

      mockAddressModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockAddresses),
            }),
          }),
        }),
      });
      mockAddressModel.countDocuments = jest.fn().mockResolvedValue(mockCount);

      const result = await addressService.getAddressesByUserId('507f1f77bcf86cd799439012', {
        page: 1,
        limit: 10,
      });

      expect(result.addresses).toEqual(mockAddresses);
      expect(result.total).toBe(mockCount);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('updateAddress', () => {
    it('should update address successfully', async () => {
      const updateData = {
        street: '456 Oak St',
        city: 'Los Angeles',
      };

      mockAddressModel.findOne = jest.fn().mockResolvedValue(mockAddress);
      mockAddressModel.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...mockAddress,
        ...updateData,
      });

      const result = await addressService.updateAddress(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        updateData
      );

      expect(result.street).toBe(updateData.street);
      expect(result.city).toBe(updateData.city);
    });

    it('should handle default address logic when updating to default', async () => {
      const updateData = {
        isDefault: true,
      };

      mockAddressModel.findOne = jest.fn().mockResolvedValue({
        ...mockAddress,
        isDefault: false,
      });
      mockAddressModel.updateMany = jest.fn().mockResolvedValue({});
      mockAddressModel.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...mockAddress,
        ...updateData,
      });

      await addressService.updateAddress(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        updateData
      );

      expect(mockAddressModel.updateMany).toHaveBeenCalled();
    });
  });

  describe('deleteAddress', () => {
    it('should soft delete address successfully', async () => {
      mockAddressModel.findOne = jest.fn().mockResolvedValue({
        ...mockAddress,
        isDefault: false,
      });
      mockAddressModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockAddress);

      await addressService.deleteAddress(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      );

      expect(mockAddressModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { isActive: false }
      );
    });

    it('should throw error when trying to delete default address', async () => {
      mockAddressModel.findOne = jest.fn().mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      });

      await expect(
        addressService.deleteAddress(
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012'
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe('setDefaultAddress', () => {
    it('should set address as default successfully', async () => {
      mockAddressModel.findOne = jest.fn().mockResolvedValue(mockAddress);
      mockAddressModel.updateMany = jest.fn().mockResolvedValue({});
      mockAddressModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockAddress);

      await addressService.setDefaultAddress(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      );

      expect(mockAddressModel.updateMany).toHaveBeenCalled();
      expect(mockAddressModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { isDefault: true }
      );
    });
  });

  describe('getDefaultAddress', () => {
    it('should return default address when found', async () => {
      mockAddressModel.findOne = jest.fn().mockResolvedValue(mockAddress);

      const result = await addressService.getDefaultAddress(
        '507f1f77bcf86cd799439012',
        AddressType.BILLING
      );

      expect(result).toEqual(mockAddress);
      expect(mockAddressModel.findOne).toHaveBeenCalledWith({
        userId: '507f1f77bcf86cd799439012',
        isDefault: true,
        isActive: true,
        type: AddressType.BILLING,
      });
    });
  });

  describe('searchAddresses', () => {
    it('should return search results', async () => {
      const mockAddresses = [mockAddress];

      mockAddressModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockAddresses),
          }),
        }),
      });

      const result = await addressService.searchAddresses(
        'Main St',
        '507f1f77bcf86cd799439012',
        AddressType.BILLING,
        10
      );

      expect(result).toEqual(mockAddresses);
      expect(mockAddressModel.find).toHaveBeenCalledWith({
        userId: '507f1f77bcf86cd799439012',
        isActive: true,
        $text: { $search: 'Main St' },
        type: AddressType.BILLING,
      });
    });
  });

  describe('bulkOperations', () => {
    it('should perform bulk operations successfully', async () => {
      const addressIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013'];
      const operation = 'activate';

      mockAddressModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockAddress);

      const result = await addressService.bulkOperations(
        addressIds,
        '507f1f77bcf86cd799439012',
        operation
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getAddressStatistics', () => {
    it('should return address statistics', async () => {
      const mockStats = {
        total: 5,
        defaultCount: 1,
        typeStats: [
          { _id: AddressType.BILLING, count: 3, defaultCount: 1 },
          { _id: AddressType.SHIPPING, count: 2, defaultCount: 0 },
        ],
      };

      mockAddressModel.countDocuments = jest.fn()
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(1); // defaultCount
      mockAddressModel.aggregate = jest.fn().mockResolvedValue(mockStats.typeStats);

      const result = await addressService.getAddressStatistics(
        '507f1f77bcf86cd799439012',
        AddressType.BILLING
      );

      expect(result.total).toBe(5);
      expect(result.defaultCount).toBe(1);
      expect(result.typeStats).toEqual(mockStats.typeStats);
    });
  });
});
