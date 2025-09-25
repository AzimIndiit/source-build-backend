import { z } from 'zod'
import { DiscountType, ProductStatus } from './product.types.js'

const discountSchema = z
  .object({
    discountType: z.nativeEnum(DiscountType),
    discountValue: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.discountType !== DiscountType.NONE) {
        return data.discountValue !== undefined && data.discountValue > 0
      }
      return true
    },
    {
      message: 'Discount value is required when discount type is not none',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE && data.discountValue) {
        return data.discountValue >= 0 && data.discountValue <= 100
      }
      return true
    },
    {
      message: 'Percentage discount must be between 0 and 100',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.discountType === DiscountType.FLAT && data.discountValue) {
        return data.discountValue >= 0
      }
      return true
    },
    {
      message: 'Flat discount must be a positive number',
      path: ['discountValue'],
    }
  )

// More lenient discount schema for drafts - allows incomplete discount data
const draftDiscountSchema = z
  .object({
    discountType: z.nativeEnum(DiscountType).optional(),
    discountValue: z.number().optional(),
  })
  .optional()

const variantSchema = z.object({
  color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid HEX color code')
    .optional()
    .or(z.literal('')), // allow empty string
  quantity: z
    .number()
    .int()
    .min(0, 'Quantity must be at least 0')
    .max(99999, 'Quantity must not exceed 99,999'),

  price: z
    .number()
    .positive('Price must be greater than 0')
    .max(999999.99, 'Price must not exceed 999,999.99'),
  priceType: z.enum(['sqft', 'linear', 'pallet']).default('sqft').optional(),
  discount: discountSchema.optional(),
  images: z.array(z.string()).optional(),
})

// More lenient variant schema for drafts
const draftVariantSchema = z.object({
  color: z.string().optional(),
  quantity: z.number().optional(),
  outOfStock: z.boolean().optional(),
  price: z.number().optional(),
  discount: draftDiscountSchema,
  images: z.array(z.string()).optional(),
})

const marketplaceOptionsSchema = z.object({
  pickup: z.boolean().optional(),
  shipping: z.boolean().optional(),
  delivery: z.boolean().optional(),
})

const dimensionsSchema = z
  .object({
    width: z.number().positive().optional(),
    length: z.number().positive().optional(),
    height: z.number().positive().optional(),
    unit: z.enum(['inches', 'cm', 'feet', 'meters']).optional().default('inches'),
  })
  .optional()

const pickupHoursSchema = z
  .union([
    z.string(),
    z.object({
      monday: z.object({ open: z.string(), close: z.string() }).optional(),
      tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
      wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
      thursday: z.object({ open: z.string(), close: z.string() }).optional(),
      friday: z.object({ open: z.string(), close: z.string() }).optional(),
      saturday: z.object({ open: z.string(), close: z.string() }).optional(),
      sunday: z.object({ open: z.string(), close: z.string() }).optional(),
    }),
  ])
  .optional()

export const createProductDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  images: z.array(z.string()).min(2, 'At least 2 images are required'),
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),
  price: z.number().positive('Price must be greater than 0'),
  priceType: z.enum(['sqft', 'linear', 'pallet']).default('sqft').optional(),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').min(1, 'Category is required'),
  description: z.string().optional(),
  subCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Subcategory ID').optional(),
  quantity: z.number().optional(),
  outOfStock: z.boolean().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  locationIds: z.array(z.string()).optional(),
  productTag: z.array(z.string()).optional().default([]),
  variants: z.array(draftVariantSchema).optional(),
  marketplaceOptions: marketplaceOptionsSchema.optional(),
  pickupHours: pickupHoursSchema,
  shippingPrice: z.number().optional(),
  deliveryDistance: z.number().optional(), // Distance in miles, optional
  localDeliveryFree: z.boolean().optional(),
  readyByDate: z.string().datetime().optional().or(z.date().optional()),
  readyByTime: z.string().optional(),
  readyByDays: z.number().min(0).max(60).optional(),
  discount: draftDiscountSchema,
  dimensions: dimensionsSchema,
  availabilityRadius: z.number().optional(),
})

export const createProductSchema = z
  .object({
    slug: z.string().optional(), // Slug is auto-generated from title
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters'),
    price: z
      .number()
      .positive('Price must be greater than 0')
      .max(999999.99, 'Price must not exceed 999,999.99'),
    priceType: z.enum(['sqft', 'linear', 'pallet']).default('sqft').optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters'),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID'),
    subCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Subcategory ID').optional(),
    quantity: z
      .number()
      .int()
      .min(0, 'Quantity must be at least 0')
      .max(99999, 'Quantity must not exceed 99,999'),
    outOfStock: z.boolean().optional(),
    brand: z
      .string()
      .trim()
      .min(2, 'Brand must be at least 2 characters')
      .max(50, 'Brand must not exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9\s\-&.]+$/,
        'Brand can only contain letters, numbers, spaces, hyphens, ampersands, and periods'
      )
      .optional()
      .or(z.literal('')),
    color: z
      .string()
      .trim()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid HEX color code')
      .optional()
      .or(z.literal('')), // allow empty string
    locationIds: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID'))
      .min(1, 'At least one location is required')
      .max(10, 'Maximum 10 locations allowed'),
    productTag: z
      .array(
        z
          .string()
          .trim()
          .min(2, 'Each tag must be at least 2 characters')
          .max(30, 'Each tag must not exceed 30 characters')
          .regex(
            /^[a-zA-Z0-9\s\-#]+$/,
            'Tags can only contain letters, numbers, spaces, hyphens, and hashtags'
          )
      )
      .max(10, 'Maximum 10 tags allowed')
      .optional().default([]),
    variants: z.array(variantSchema).max(5, 'Maximum 5 variants allowed').optional(),
    marketplaceOptions: marketplaceOptionsSchema.required(),
    pickupHours: pickupHoursSchema,
    deliveryDistance: z.number().optional(),
    localDeliveryFree: z.boolean().optional(),
    shippingPrice: z.number().min(0, 'Shipping price must be positive').optional(),
    readyByDate: z.string().datetime().optional().or(z.date().optional()),
    readyByTime: z.string().optional(),
    readyByDays: z.number().min(0).max(60).optional(),
    discount: discountSchema.optional(),
    dimensions: dimensionsSchema,
    availabilityRadius: z
      .number()
      .min(0, 'Availability radius must be positive')
      .max(100, 'Availability radius must not exceed 100 km')
      .optional(),
    images: z.array(z.string()).optional(),
    status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.PENDING),
  })
  .refine(
    (data) => {
      // At least one marketplace option must be selected
      if (
        !data.marketplaceOptions ||
        (!data.marketplaceOptions.pickup &&
          !data.marketplaceOptions.shipping &&
          !data.marketplaceOptions.delivery)
      ) {
        return false
      }
      return true
    },
    {
      message: 'At least one marketplace option (Pickup, Shipping, or Delivery) must be selected',
      path: ['marketplaceOptions'],
    }
  )
  .refine(
    (data) => {
      if (data.marketplaceOptions?.pickup && !data.pickupHours) {
        return false
      }
      return true
    },
    {
      message: 'Pickup hours are required when pickup option is selected',
      path: ['pickupHours'],
    }
  )
  .refine(
    (data) => {
      if (data.marketplaceOptions?.shipping && data.shippingPrice === undefined) {
        return false
      }
      return true
    },
    {
      message: 'Shipping price is required when shipping option is selected',
      path: ['shippingPrice'],
    }
  )

export const updateProductSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),

    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters')
      .optional(),
    price: z
      .number()
      .positive('Price must be greater than 0')
      .max(999999.99, 'Price must not exceed 999,999.99')
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters')
      .optional(),
    priceType: z.enum(['sqft', 'linear', 'pallet']).default('sqft').optional(),
    category:z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').optional(),
    subCategory:z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Subcategory ID')
      .optional(),
    quantity: z
      .number()
      .int()
      .min(0, 'Quantity must be at least 0')
      .max(99999, 'Quantity must not exceed 99,999')
      .optional(),
    outOfStock: z.boolean().optional(),
    brand: z
      .string()
      .trim()
      .min(2, 'Brand must be at least 2 characters')
      .max(50, 'Brand must not exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9\s\-&.]+$/,
        'Brand can only contain letters, numbers, spaces, hyphens, ampersands, and periods'
      )

      .optional()
      .or(z.literal('')),
    color: z
      .string()
      .trim()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid HEX color code')
      .optional()
      .or(z.literal('')), // allow empty string

    locationIds: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID'))
      .min(1, 'At least one location is required')
      .max(10, 'Maximum 10 locations allowed')
      .optional(),
    productTag: z
      .array(
        z
          .string()
          .trim()
          .min(2, 'Each tag must be at least 2 characters')
          .max(30, 'Each tag must not exceed 30 characters')
          .regex(
            /^[a-zA-Z0-9\s\-#]+$/,
            'Tags can only contain letters, numbers, spaces, hyphens, and hashtags'
          )
      )
      .max(10, 'Maximum 10 tags allowed')
      .optional().default([]),
    variants: z.array(variantSchema).max(5, 'Maximum 5 variants allowed').optional(),
    marketplaceOptions: marketplaceOptionsSchema.optional(),
    pickupHours: pickupHoursSchema,
    deliveryDistance: z.number().optional(),
    localDeliveryFree: z.boolean().optional(),
    shippingPrice: z.number().min(0, 'Shipping price must be positive').optional(),
    readyByDate: z.string().datetime().optional().or(z.date().optional()),
    readyByTime: z.string().optional(),
    readyByDays: z.number().min(0).max(60).optional(),
    discount: discountSchema.optional(),
    dimensions: dimensionsSchema,
    availabilityRadius: z
      .number()
      .min(0, 'Availability radius must be positive')
      .max(100, 'Availability radius must not exceed 100 km')
      .optional(),
    images: z.array(z.string()).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update')
  .refine(
    (data) => {
      // If marketplaceOptions is being updated, ensure at least one option is selected
      if (
        data.marketplaceOptions &&
        !data.marketplaceOptions.pickup &&
        !data.marketplaceOptions.shipping &&
        !data.marketplaceOptions.delivery
      ) {
        return false
      }
      return true
    },
    {
      message: 'At least one marketplace option (Pickup, Shipping, or Delivery) must be selected',
      path: ['marketplaceOptions'],
    }
  )

export const getProductBySlugSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
})

export const deleteProductSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
})

export const getProductsSchema = z.object({
  category:z.string().optional(),
  subCategory: z.string().optional(),
  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  seller: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid seller ID')
    .optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  featured: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().min(1).max(100)),
  // Filter parameters from FilterDropdown
  popularity: z.union([z.string(), z.array(z.string())]).optional(),
  newest: z.union([z.string(), z.array(z.string())]).optional(),
  availability: z.union([z.string(), z.array(z.string())]).optional(),
  readyTime: z.union([z.string(), z.array(z.string())]).optional(),
  // Also accept bracket notation (when sent from query string)
  'popularity[]': z.union([z.string(), z.array(z.string())]).optional(),
  'newest[]': z.union([z.string(), z.array(z.string())]).optional(),
  'availability[]': z.union([z.string(), z.array(z.string())]).optional(),
  'readyTime[]': z.union([z.string(), z.array(z.string())]).optional(),
  sorting: z.enum(['ascending', 'descending']).optional(),
  pricing: z.enum(['high-to-low', 'low-to-high', 'custom']).optional(),
  priceRange: z.string().optional(), // Format: "min,max"
  // Location-based filtering
  location: z.string().optional(),
  latitude: z.string().transform(Number).pipe(z.number().min(-90).max(90)).optional(),
  longitude: z.string().transform(Number).pipe(z.number().min(-180).max(180)).optional(),
  maxDistance: z
    .string()
    .optional()
    .default('10')
    .transform(Number)
    .pipe(z.number().min(0).max(100)),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type GetProductsQuery = z.infer<typeof getProductsSchema>
