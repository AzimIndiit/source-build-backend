# Testing Documentation

## Overview
This directory contains all tests for the Source Build backend application, following a comprehensive testing strategy with unit, integration, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                 # Unit tests for individual functions/classes
│   └── services/        # Service layer unit tests
├── integration/         # API endpoint integration tests
├── e2e/                 # End-to-end user journey tests
├── fixtures/            # Test data and mock objects
├── helpers/             # Test utilities and helper functions
└── README.md           # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Categories

### 1. Unit Tests (`/unit`)
Tests individual components in isolation:
- Service methods
- Utility functions
- Model methods
- Validators
- Helpers

Example:
```typescript
describe('AuthService', () => {
  it('should hash password correctly', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests (`/integration`)
Tests API endpoints with database:
- HTTP request/response
- Authentication/authorization
- Database operations
- Error handling
- Rate limiting

Example:
```typescript
describe('POST /api/v1/auth/login', () => {
  it('should return tokens for valid credentials', async () => {
    // Test implementation
  });
});
```

### 3. E2E Tests (`/e2e`)
Tests complete user workflows:
- User registration → verification → login
- Product browsing → cart → checkout → order
- Returns and refunds
- Review and rating flows

Example:
```typescript
describe('Complete Purchase Journey', () => {
  it('should complete from registration to order', async () => {
    // Test implementation
  });
});
```

## Test Fixtures

### User Fixtures (`fixtures/users.fixture.ts`)
Pre-defined test users:
- `testUsers.buyer` - Verified buyer account
- `testUsers.seller` - Verified seller account
- `testUsers.admin` - Admin account
- `testUsers.driver` - Driver account
- `testUsers.unverified` - Unverified account
- `testUsers.inactive` - Deactivated account

### Product Fixtures (`fixtures/products.fixture.ts`)
Pre-defined test products:
- `testProducts.electronics` - Electronics category product
- `testProducts.clothing` - Clothing with variants
- `testProducts.food` - Food & beverage product
- `testProducts.outOfStock` - Out of stock product
- `testProducts.inactive` - Inactive product

## Test Helpers

### Auth Helper (`helpers/auth.helper.ts`)
- `generateAccessToken()` - Create test JWT tokens
- `generateRefreshToken()` - Create refresh tokens
- `generateExpiredToken()` - Create expired tokens
- `getAuthHeaders()` - Generate auth headers
- `mockOAuthProfile()` - Mock OAuth provider data

### Database Helper (`helpers/database.helper.ts`)
- `connect()` - Connect to test database
- `disconnect()` - Clean disconnect
- `clearDatabase()` - Clear all collections
- `seedDatabase()` - Seed with test data
- `withTransaction()` - Test transactions

### Request Helper (`helpers/request.helper.ts`)
- `authenticatedRequest()` - Make authenticated API calls
- `uploadFile()` - Test file uploads
- `paginatedRequest()` - Test pagination
- `testRateLimit()` - Test rate limiting
- `assertApiResponse()` - Assert response structure

## Writing Tests

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up after tests
3. **Mocking**: Mock external dependencies
4. **Assertions**: Use descriptive assertions
5. **Coverage**: Aim for >80% code coverage

### Test Template

```typescript
import { jest } from '@jest/globals';
import { testUsers, testProducts } from '../fixtures';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup
  });

  beforeEach(() => {
    // Reset state
  });

  afterEach(() => {
    // Cleanup
  });

  afterAll(async () => {
    // Teardown
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const testData = { /* ... */ };

      // Act
      const result = await someFunction(testData);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });

    it('should handle errors correctly', async () => {
      // Test error scenarios
      await expect(someFunction(invalidData))
        .rejects.toThrow('Expected error');
    });
  });
});
```

## Mocking

### Database Mocking
Tests use MongoDB Memory Server for isolation:
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
```

### Redis Mocking
Redis is automatically mocked in `jest.setup.ts`

### External Services
- Email service - Mocked to prevent actual emails
- AWS S3 - Mocked for file uploads
- Stripe - Mocked for payment processing
- OAuth providers - Mocked authentication

## Custom Matchers

### `toBeValidId()`
Check if value is valid MongoDB ObjectId:
```typescript
expect(result._id).toBeValidId();
```

### `toHaveStatus(status)`
Check response status:
```typescript
expect(response).toHaveStatus(200);
```

## Environment Variables

Tests use `.env.test` file with test-specific configurations:
- Test database connections
- Mock service credentials
- Disabled external services
- Test-specific timeouts

## Debugging Tests

### Run Single Test File
```bash
npm test -- auth.service.test.ts
```

### Run Tests with Debugging
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
npm test -- --verbose
```

### Show Test Coverage Gaps
```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:
1. Unit tests run first (fast)
2. Integration tests run in parallel
3. E2E tests run last (slowest)
4. Coverage reports generated
5. Fails if coverage < 80%

## Common Issues

### Issue: Tests Timeout
**Solution**: Increase timeout in `jest.config.ts` or specific test

### Issue: Database Connection Errors
**Solution**: Ensure MongoDB Memory Server is installed

### Issue: Port Already in Use
**Solution**: Use different port in test environment

### Issue: Flaky Tests
**Solution**: Add proper async/await and increase timeouts

## Contributing

When adding new features:
1. Write unit tests first (TDD)
2. Add integration tests for API endpoints
3. Update E2E tests if user flow changes
4. Maintain >80% coverage
5. Update this documentation

## Test Metrics

Target metrics:
- **Unit Test Coverage**: >85%
- **Integration Test Coverage**: >80%
- **E2E Test Coverage**: Critical paths 100%
- **Test Execution Time**: <5 minutes
- **Test Reliability**: >99% pass rate