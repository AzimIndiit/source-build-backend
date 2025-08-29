import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    on: jest.fn(),
    quit: jest.fn()
  }))
}));

// Mock Winston logger
jest.mock('./src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn()
  }
}));

// MongoDB Memory Server instance
let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  // Create MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to MongoDB
  await mongoose.connect(mongoUri);

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
});

// Cleanup after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clear database collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from MongoDB
  await mongoose.disconnect();

  // Stop MongoDB memory server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}

// Custom matchers (optional)
expect.extend({
  toBeValidId(received: any) {
    const pass = mongoose.isValidObjectId(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid MongoDB ObjectId`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid MongoDB ObjectId`,
        pass: false
      };
    }
  },
  
  toHaveStatus(received: any, status: number) {
    const pass = received.status === status;
    if (pass) {
      return {
        message: () => `expected response not to have status ${status}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected response to have status ${status}, but got ${received.status}`,
        pass: false
      };
    }
  }
});

// Extend Jest matchers TypeScript definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidId(): R;
      toHaveStatus(status: number): R;
    }
  }
}

export {};