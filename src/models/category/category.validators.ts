import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  image: z.string()
    .url('Image must be a valid URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  order: z.number()
    .int('Order must be an integer')
    .min(0, 'Order must be a positive number')
    .optional()
});

export const updateCategorySchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  image: z.string()
    .url('Image must be a valid URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
  order: z.number()
    .int('Order must be an integer')
    .min(0, 'Order must be a positive number')
    .optional()
});

export const getCategoriesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  isActive: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'order']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesSchema>;