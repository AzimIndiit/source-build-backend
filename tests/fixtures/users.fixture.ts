import { UserRole } from '../../src/types/models/user.types';
import bcrypt from 'bcryptjs';

export const testUsers = {
  buyer: {
    _id: '507f1f77bcf86cd799439011',
    email: 'buyer@test.com',
    password: 'BuyerPass123!',
    hashedPassword: bcrypt.hashSync('BuyerPass123!', 10),
    name: 'Test Buyer',
    role: UserRole.BUYER,
    phone: '+1234567890',
    isVerified: true,
    isActive: true,
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  seller: {
    _id: '507f1f77bcf86cd799439012',
    email: 'seller@test.com',
    password: 'SellerPass123!',
    hashedPassword: bcrypt.hashSync('SellerPass123!', 10),
    name: 'Test Seller',
    role: UserRole.SELLER,
    phone: '+1234567891',
    businessName: 'Test Store',
    businessDescription: 'Quality products store',
    isVerified: true,
    isActive: true,
    sellerInfo: {
      businessName: 'Test Store',
      businessDescription: 'Quality products store',
      businessAddress: {
        street: '456 Business Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA'
      },
      taxId: 'TAX123456',
      rating: 4.5,
      totalSales: 1000,
      totalProducts: 50
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  admin: {
    _id: '507f1f77bcf86cd799439013',
    email: 'admin@test.com',
    password: 'AdminPass123!',
    hashedPassword: bcrypt.hashSync('AdminPass123!', 10),
    name: 'Test Admin',
    role: UserRole.ADMIN,
    phone: '+1234567892',
    isVerified: true,
    isActive: true,
    permissions: ['all'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  driver: {
    _id: '507f1f77bcf86cd799439014',
    email: 'driver@test.com',
    password: 'DriverPass123!',
    hashedPassword: bcrypt.hashSync('DriverPass123!', 10),
    name: 'Test Driver',
    role: UserRole.DRIVER,
    phone: '+1234567893',
    isVerified: true,
    isActive: true,
    driverInfo: {
      licenseNumber: 'DL123456',
      vehicleInfo: {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        plateNumber: 'ABC123',
        color: 'Blue'
      },
      rating: 4.8,
      totalDeliveries: 500,
      isAvailable: true
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  unverified: {
    _id: '507f1f77bcf86cd799439015',
    email: 'unverified@test.com',
    password: 'UnverifiedPass123!',
    hashedPassword: bcrypt.hashSync('UnverifiedPass123!', 10),
    name: 'Unverified User',
    role: UserRole.BUYER,
    phone: '+1234567894',
    isVerified: false,
    isActive: true,
    emailVerificationToken: 'verify_token_123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  inactive: {
    _id: '507f1f77bcf86cd799439016',
    email: 'inactive@test.com',
    password: 'InactivePass123!',
    hashedPassword: bcrypt.hashSync('InactivePass123!', 10),
    name: 'Inactive User',
    role: UserRole.BUYER,
    phone: '+1234567895',
    isVerified: true,
    isActive: false,
    deactivatedAt: new Date('2024-01-15'),
    deactivationReason: 'User requested',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  }
};

export const createTestUser = (overrides = {}) => {
  return {
    ...testUsers.buyer,
    ...overrides
  };
};

export const createManyTestUsers = (count: number, role: UserRole = UserRole.BUYER) => {
  return Array.from({ length: count }, (_, i) => ({
    _id: `507f1f77bcf86cd7994390${20 + i}`,
    email: `user${i}@test.com`,
    password: `Password${i}123!`,
    hashedPassword: bcrypt.hashSync(`Password${i}123!`, 10),
    name: `Test User ${i}`,
    role,
    phone: `+123456789${i}`,
    isVerified: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }));
};