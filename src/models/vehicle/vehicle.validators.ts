import { z } from 'zod';

// Vehicle types enum
export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
  VAN = 'van',
  PICKUP = 'pickup',
  MINIVAN = 'minivan',
  OTHER = 'other',
}

// Common vehicle manufacturers
export enum VehicleManufacturer {
  TOYOTA = 'toyota',
  HONDA = 'honda',
  FORD = 'ford',
  CHEVROLET = 'chevrolet',
  NISSAN = 'nissan',
  HYUNDAI = 'hyundai',
  KIA = 'kia',
  MAZDA = 'mazda',
  VOLKSWAGEN = 'volkswagen',
  MERCEDES = 'mercedes',
  BMW = 'bmw',
  AUDI = 'audi',
  TESLA = 'tesla',
  OTHER = 'other',
}

// Registration number validation patterns for different regions
const registrationNumberPatterns = {
  default: /^[A-Z0-9]{2,}[\s-]?[A-Z0-9]{1,}[\s-]?[A-Z0-9]{1,}$/i,
  // Add more patterns for specific regions if needed
};

// Base vehicle schema for validation
const baseVehicleSchema = z.object({
  vehicleType: z
    .string()
    .trim()
    .refine(
      (val) => Object.values(VehicleType).includes(val as VehicleType),
      'Invalid vehicle type'
    ),
  vehicleManufacturer: z
    .string()
    .trim()
    .min(2, 'Manufacturer must be at least 2 characters')
    .max(50, 'Manufacturer must not exceed 50 characters'),
  vehicleModel: z
    .string()
    .trim()
    .min(1, 'Model is required')
    .max(50, 'Model must not exceed 50 characters'),
  vehicleRegistrationNumber: z
    .string()
    .trim()
    .min(2, 'Registration number must be at least 2 characters')
    .max(20, 'Registration number must not exceed 20 characters')
    .transform((val) => val.toUpperCase())
    .refine(
      (val) => registrationNumberPatterns.default.test(val),
      'Invalid registration number format'
    ),
  
});

// Create vehicle schema
export const createVehicleSchema = baseVehicleSchema.extend({
  vehicleImages: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one vehicle image is required')
    .max(5, 'Maximum 5 vehicle images allowed')
    .refine(
      (images) => images.every((img) => img.startsWith('http') || img.startsWith('/')),
      'All vehicle images must be valid URLs or paths'
    ),
  insuranceImages: z
    .array(z.string().url('Invalid image URL'))
    .max(2, 'Maximum 2 insurance images allowed')
    .optional()
    .default([]),
});

// Update vehicle schema (all fields optional except ID)
export const updateVehicleSchema = z.object({
  vehicleType: z
    .string()
    .trim()
    .refine(
      (val) => Object.values(VehicleType).includes(val as VehicleType),
      'Invalid vehicle type'
    )
    .optional(),
  vehicleManufacturer: z
    .string()
    .trim()
    .min(2, 'Manufacturer must be at least 2 characters')
    .max(50, 'Manufacturer must not exceed 50 characters')
    .optional(),
  vehicleModel: z
    .string()
    .trim()
    .min(1, 'Model is required')
    .max(50, 'Model must not exceed 50 characters')
    .optional(),
  vehicleRegistrationNumber: z
    .string()
    .trim()
    .min(2, 'Registration number must be at least 2 characters')
    .max(20, 'Registration number must not exceed 20 characters')
    .transform((val) => val.toUpperCase())
    .refine(
      (val) => registrationNumberPatterns.default.test(val),
      'Invalid registration number format'
    )
    .optional(),
  vehicleImages: z
    .array(z.string().url('Invalid image URL'))
    .max(5, 'Maximum 5 vehicle images allowed')
    .refine(
      (images) => images.every((img) => img.startsWith('http') || img.startsWith('/')),
      'All vehicle images must be valid URLs or paths'
    )
    .optional(),
  insuranceImages: z
    .array(z.string().url('Invalid image URL'))
    .max(2, 'Maximum 2 insurance images allowed')
    .optional(),
  isActive: z.boolean().optional(),
});

// Query parameters schema for listing vehicles
export const getVehiclesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  isActive: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .optional(),
  vehicleType: z
    .string()
    .optional()
    .refine(
      (val) => !val || Object.values(VehicleType).includes(val as VehicleType),
      'Invalid vehicle type'
    ),
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim())
    .refine(
      (val) => !val || val.length <= 100,
      'Search term must not exceed 100 characters'
    ),
});

// Vehicle ID parameter schema
export const vehicleIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format'),
});

// Export validation middleware helpers
export const validateCreateVehicle = (data: unknown) => {
  return createVehicleSchema.parse(data);
};

export const validateUpdateVehicle = (data: unknown) => {
  return updateVehicleSchema.parse(data);
};

export const validateVehicleQuery = (data: unknown) => {
  return getVehiclesQuerySchema.parse(data);
};

export const validateVehicleId = (id: string) => {
  return vehicleIdParamSchema.parse({ id }).id;
};

// Type exports
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleQueryInput = z.infer<typeof getVehiclesQuerySchema>;