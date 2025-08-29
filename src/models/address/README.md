# Address Module

This module provides comprehensive address management functionality for the Source Build backend, following the established patterns and architecture.

## Overview

The Address module allows users to manage multiple addresses with support for:
- Different address types (billing, shipping, both)
- Default address management
- Soft deletion
- Search and filtering
- Bulk operations
- Statistics and analytics

## Architecture

### Models
- **`address.model.ts`** - Mongoose model definition
- **`address.schemas.ts`** - Mongoose schema with middleware and static methods
- **`address.types.ts`** - TypeScript interfaces and enums
- **`address.validators.ts`** - Zod validation schemas

### Services
- **`address.service.ts`** - Business logic layer with CRUD operations

### Controllers
- **`address.controller.ts`** - HTTP request handlers with validation

### Routes
- **`address.routes.ts`** - Express router with Swagger documentation

## Features

### Core Functionality
- ✅ Create, Read, Update, Delete (CRUD) operations
- ✅ Default address management
- ✅ Address type categorization (billing, shipping, both)
- ✅ Soft deletion (isActive flag)
- ✅ User-specific address isolation
- ✅ Comprehensive validation

### Advanced Features
- ✅ Search functionality with text indexing
- ✅ Pagination and sorting
- ✅ Bulk operations (activate, deactivate, delete)
- ✅ Statistics and analytics
- ✅ Health check endpoint

### Security Features
- ✅ User authentication required for all operations
- ✅ User can only access their own addresses
- ✅ Input validation and sanitization
- ✅ SQL injection prevention

## API Endpoints

### Public Endpoints
- `GET /api/v1/addresses/health` - Health check

### Protected Endpoints (Authentication Required)
- `POST /api/v1/addresses` - Create new address
- `GET /api/v1/addresses` - List user addresses (with pagination/filtering)
- `GET /api/v1/addresses/:id` - Get specific address
- `PATCH /api/v1/addresses/:id` - Update address
- `DELETE /api/v1/addresses/:id` - Delete address (soft delete)
- `PATCH /api/v1/addresses/:id/set-default` - Set address as default
- `GET /api/v1/addresses/default` - Get default address
- `GET /api/v1/addresses/search` - Search addresses
- `PATCH /api/v1/addresses/bulk` - Bulk operations
- `GET /api/v1/addresses/statistics` - Get address statistics

## Data Model

### Address Schema
```typescript
interface IAddress {
  _id?: string;
  userId: string;           // Owner of the address
  label?: string;           // Optional label (e.g., "Home", "Work")
  street: string;           // Street address
  city: string;            // City name
  state: string;           // State/province
  country: string;         // Country name
  zipCode: string;         // ZIP/postal code
  isDefault: boolean;      // Whether this is the default address
  type: AddressType;       // billing, shipping, or both
  isActive: boolean;       // Soft delete flag
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
}
```

### Address Types
- `BILLING` - For billing purposes
- `SHIPPING` - For shipping/delivery
- `BOTH` - For both billing and shipping

## Usage Examples

### Creating an Address
```typescript
import addressService from '@/services/address.service.js';

const newAddress = await addressService.createAddress({
  userId: 'user123',
  label: 'Home',
  street: '123 Main St',
  city: 'New York',
  state: 'NY',
  country: 'USA',
  zipCode: '10001',
  type: AddressType.BILLING,
  isDefault: true
});
```

### Getting User Addresses
```typescript
const addresses = await addressService.getAddressesByUserId('user123', {
  type: AddressType.SHIPPING,
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

### Setting Default Address
```typescript
await addressService.setDefaultAddress(
  'address123',
  'user123',
  AddressType.BILLING
);
```

## Database Indexes

The module includes optimized database indexes for:
- User ID lookups
- Address type filtering
- Default address queries
- Text search functionality
- Compound queries (userId + type, userId + isDefault)

## Validation

All inputs are validated using Zod schemas with:
- Required field validation
- String length limits
- Enum value validation
- MongoDB ObjectId format validation
- Custom business rule validation

## Error Handling

The module provides comprehensive error handling:
- `400` - Validation errors
- `401` - Authentication required
- `404` - Address not found
- `500` - Internal server errors

## Testing

Unit tests are included for:
- Service layer business logic
- Validation schemas
- Error handling scenarios
- Edge cases and business rules

## Dependencies

- **Mongoose** - MongoDB ODM
- **Zod** - Schema validation
- **Express** - Web framework
- **JWT** - Authentication

## Future Enhancements

- [ ] Address geocoding and coordinates
- [ ] Address verification services integration
- [ ] International address format support
- [ ] Address templates for common locations
- [ ] Address sharing between users (family accounts)
- [ ] Address history and audit trail

## Contributing

When adding new features to the Address module:
1. Follow the existing code patterns
2. Add comprehensive validation
3. Include unit tests
4. Update Swagger documentation
5. Follow the established error handling patterns
6. Ensure proper user isolation and security
