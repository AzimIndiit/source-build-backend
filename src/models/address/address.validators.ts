import { z } from 'zod'
import { AddressType } from './address.types.js'

/**
 * Address type options for form validation
 */
export const addressTypeOptions = [
  { label: 'Billing', value: AddressType.BILLING },
  { label: 'Shipping', value: AddressType.SHIPPING },
  { label: 'Both', value: AddressType.BOTH },
]

/**
 * Base address validation schema
 */
const baseAddressSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,10}$/,
      'Invalid phone number format'
    ),

  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must not exceed 100 characters'),
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State must not exceed 100 characters'),
  country: z
    .string()
    .trim()
    .min(1, 'Country is required')
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country must not exceed 100 characters'),
  zipCode: z
    .string()
    .trim()
    .min(1, 'ZIP code is required')
    .min(3, 'ZIP code must be at least 3 characters')
    .max(20, 'ZIP code must not exceed 20 characters'),
  type: z.nativeEnum(AddressType, {
    errorMap: () => ({ message: 'Invalid address type' }),
  }).default(AddressType.SHIPPING),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  formattedAddress: z.string().trim().max(500).optional(),
  location: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
})

/**
 * Create address validation schema
 */
export const createAddressSchema = z.object({
  body: baseAddressSchema,
})

/**
 * Update address validation schema
 */
export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format'),
  }),
  body: baseAddressSchema.partial().extend({
    isActive: z.boolean().optional(),
  }),
})

/**
 * Address query validation schema
 */
export const addressQuerySchema = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
  type: z.nativeEnum(AddressType).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  search: z.string().trim().optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .pipe(z.number().min(1, 'Page must be at least 1'))
    .optional()
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100'))
    .optional()
    .default('10'),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'street', 'city', 'isDefault'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

/**
 * Set default address validation schema
 */
export const setDefaultAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format'),
  }),
})

/**
 * Bulk address operations validation schema
 */
export const bulkAddressOperationsSchema = z.object({
  addressIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format'))
    .min(1, 'At least one address ID is required')
    .max(100, 'Cannot process more than 100 addresses at once'),
  operation: z.enum(['activate', 'deactivate', 'delete']),
})

/**
 * Address search validation schema
 */
export const addressSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Search query is required')
    .max(100, 'Search query must not exceed 100 characters'),
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
  type: z.nativeEnum(AddressType).optional(),
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .optional()
    .default(10),
})

/**
 * Address import validation schema (for bulk operations)
 */
export const addressImportSchema = z.object({
  addresses: z
    .array(createAddressSchema)
    .min(1, 'At least one address is required')
    .max(100, 'Cannot import more than 100 addresses at once'),
  overwrite: z.boolean().default(false),
  validateOnly: z.boolean().default(false),
})

/**
 * Address export validation schema
 */
export const addressExportSchema = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
  type: z.nativeEnum(AddressType).optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  includeInactive: z.boolean().default(false),
})

/**
 * Address statistics validation schema
 */
export const addressStatisticsSchema = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
  type: z.nativeEnum(AddressType).optional(),
  period: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
  groupBy: z.enum(['type', 'country', 'state', 'city']).optional(),
})

/**
 * Get address validation schema (for params)
 */
export const getAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format'),
  }),
})

/**
 * Delete address validation schema (for params)
 */
export const deleteAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format'),
  }),
})

/**
 * Get user addresses validation schema (for query)
 */
export const getUserAddressesSchema = z.object({
  query: addressQuerySchema,
})
