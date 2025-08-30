import { z } from 'zod';
import { DiscountType, ProductStatus } from './product.types.js';

const discountSchema = z.object({
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().optional(),
})
  .refine(
    (data) => {
      if (data.discountType !== DiscountType.NONE) {
        return data.discountValue !== undefined && data.discountValue > 0;
      }
      return true;
    },
    {
      message: 'Discount value is required when discount type is not none',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE && data.discountValue) {
        return data.discountValue >= 0 && data.discountValue <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount must be between 0 and 100',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.discountType === DiscountType.FLAT && data.discountValue) {
        return data.discountValue >= 0;
      }
      return true;
    },
    {
      message: 'Flat discount must be a positive number',
      path: ['discountValue'],
    }
  );

const variantSchema = z.object({
  color: z
    .string()
    .trim()
    .min(1, 'Color is required')
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid HEX color code'),
  quantity: z
    .number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .max(99999, 'Quantity must not exceed 99,999'),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .max(999999.99, 'Price must not exceed 999,999.99'),
  discount: discountSchema.optional(),
  images: z.array(z.string()).optional(),
});

const marketplaceOptionsSchema = z.object({
  pickup: z.boolean().optional(),
  shipping: z.boolean().optional(),
  delivery: z.boolean().optional(),
});

export const createProductSchema = z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters'),
    price: z
      .number()
      .positive('Price must be greater than 0')
      .max(999999.99, 'Price must not exceed 999,999.99'),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters'),
    category: z
      .string()
      .trim()
      .min(1, 'Category is required')
      .max(50, 'Category must not exceed 50 characters'),
    subCategory: z
      .string()
      .trim()
      .min(1, 'Sub category is required')
      .max(50, 'Sub category must not exceed 50 characters'),
    quantity: z
      .number()
      .int()
      .min(1, 'Quantity must be at least 1')
      .max(99999, 'Quantity must not exceed 99,999'),
    brand: z
      .string()
      .trim()
      .min(2, 'Brand must be at least 2 characters')
      .max(50, 'Brand must not exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9\s\-&.]+$/,
        'Brand can only contain letters, numbers, spaces, hyphens, ampersands, and periods'
      ),
    color: z
      .string()
      .trim()
      .min(1, 'Color is required')
      .regex(
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        'Please enter a valid HEX color code (e.g., #FF0000)'
      ),
    locations: z
      .array(
        z.object({
          address: z
            .string()
            .trim()
            .min(5, 'Location must be at least 5 characters')
            .max(200, 'Location must not exceed 200 characters'),
          coordinates: z.object({
            type: z.literal('Point').default('Point'),
            coordinates: z
              .tuple([z.number(), z.number()])
              .refine(
                ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
                'Invalid coordinates. Must be [longitude, latitude]'
              ),
          }),
          city: z.string().trim().max(100, 'City must not exceed 100 characters').optional(),
          state: z.string().trim().max(100, 'State must not exceed 100 characters').optional(),
          country: z.string().trim().max(100, 'Country must not exceed 100 characters').optional(),
          postalCode: z.string().trim().max(20, 'Postal code must not exceed 20 characters').optional(),
          isDefault: z.boolean().default(false).optional(),
          availabilityRadius: z
            .number()
            .min(0, 'Availability radius must be positive')
            .max(100, 'Availability radius must not exceed 100 km')
            .default(10)
            .optional(),
        })
      )
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
      .min(1, 'At least one product tag is required')
      .max(10, 'Maximum 10 tags allowed'),
    variants: z.array(variantSchema).max(5, 'Maximum 5 variants allowed').optional(),
    marketplaceOptions: marketplaceOptionsSchema.optional(),
    pickupHours: z
      .string()
      .trim()
      .max(100, 'Pickup hours must not exceed 100 characters')
      .optional(),
    shippingPrice: z.number().min(0, 'Shipping price must be positive').optional(),
    readyByDate: z.string().datetime().optional().or(z.date().optional()),
    readyByTime: z.string().optional(),
    discount: discountSchema.optional(),
    images: z.array(z.string()).optional(),
    status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),

   
}) .refine(
  (data) => {
    if (data.marketplaceOptions?.pickup && !data.pickupHours?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: 'Pickup hours are required when pickup option is selected',
    path: ['pickupHours'],
  }
)
.refine(
  (data) => {
    if (data.marketplaceOptions?.shipping && data.shippingPrice === undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Shipping price is required when shipping option is selected',
    path: ['shippingPrice'],
  }
);

export const updateProductSchema = z.object({
  
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
    category: z
      .string()
      .trim()
      .min(1, 'Category is required')
      .max(50, 'Category must not exceed 50 characters')
      .optional(),
    subCategory: z
      .string()
      .trim()
      .min(1, 'Sub category is required')
      .max(50, 'Sub category must not exceed 50 characters')
      .optional(),
    quantity: z
      .number()
      .int()
      .min(0, 'Quantity must be at least 0')
      .max(99999, 'Quantity must not exceed 99,999')
      .optional(),
    brand: z
      .string()
      .trim()
      .min(2, 'Brand must be at least 2 characters')
      .max(50, 'Brand must not exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9\s\-&.]+$/,
        'Brand can only contain letters, numbers, spaces, hyphens, ampersands, and periods'
      )
      .optional(),
    color: z
      .string()
      .trim()
      .min(1, 'Color is required')
      .regex(
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        'Please enter a valid HEX color code (e.g., #FF0000)'
      )
      .optional(),
    locations: z
      .array(
        z.object({
          address: z
            .string()
            .trim()
            .min(5, 'Location must be at least 5 characters')
            .max(200, 'Location must not exceed 200 characters'),
          coordinates: z.object({
            type: z.literal('Point').default('Point'),
            coordinates: z
              .tuple([z.number(), z.number()])
              .refine(
                ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
                'Invalid coordinates. Must be [longitude, latitude]'
              ),
          }),
          city: z.string().trim().max(100, 'City must not exceed 100 characters').optional(),
          state: z.string().trim().max(100, 'State must not exceed 100 characters').optional(),
          country: z.string().trim().max(100, 'Country must not exceed 100 characters').optional(),
          postalCode: z.string().trim().max(20, 'Postal code must not exceed 20 characters').optional(),
          isDefault: z.boolean().default(false).optional(),
          availabilityRadius: z
            .number()
            .min(0, 'Availability radius must be positive')
            .max(100, 'Availability radius must not exceed 100 km')
            .default(10)
            .optional(),
        })
      )
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
      .min(1, 'At least one product tag is required')
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    variants: z.array(variantSchema).max(5, 'Maximum 5 variants allowed').optional(),
    marketplaceOptions: marketplaceOptionsSchema.optional(),
    pickupHours: z
      .string()
      .trim()
      .max(100, 'Pickup hours must not exceed 100 characters')
      .optional(),
    shippingPrice: z.number().min(0, 'Shipping price must be positive').optional(),
    readyByDate: z.string().datetime().optional().or(z.date().optional()),
    readyByTime: z.string().optional(),
    discount: discountSchema.optional(),
    images: z.array(z.string()).optional(),
    status: z.nativeEnum(ProductStatus).optional(),

}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

export const getProductBySlugSchema = z.object({
    slug: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
});

export const deleteProductSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
});

export const getProductsSchema = z.object({
    category: z.string().optional(),
    subCategory: z.string().optional(),
    minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    brand: z.string().optional(),
    color: z.string().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    seller: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid seller ID').optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    featured: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
    // Location-based filtering
    latitude: z.string().transform(Number).pipe(z.number().min(-90).max(90)).optional(),
    longitude: z.string().transform(Number).pipe(z.number().min(-180).max(180)).optional(),
    maxDistance: z.string().transform(Number).pipe(z.number().min(0).max(100)).optional().default('10'),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type GetProductsQuery = z.infer<typeof getProductsSchema>;