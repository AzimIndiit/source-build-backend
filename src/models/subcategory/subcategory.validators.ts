import { z } from 'zod';

// Attribute value schema
const attributeValueSchema = z.object({
  value: z.string().trim().min(1, 'Value is required'),
  order: z.number().optional()
});

// Attribute schema
const attributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required').max(100),
  inputType: z.enum(['text', 'number', 'dropdown', 'multiselect', 'boolean', 'radio']),
  required: z.boolean().optional(),
  values: z.array(attributeValueSchema).optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional()
});

export const createSubcategorySchema = z.object({
  name: z.string()
    .min(2, 'Subcategory name must be at least 2 characters')
    .max(100, 'Subcategory name cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  image: z.string()
    .url('Image must be a valid URL')
    .optional()
    .or(z.literal('')),
  category: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
  isActive: z.boolean().default(true),
  order: z.number()
    .int('Order must be an integer')
    .min(0, 'Order must be a positive number')
    .optional(),
  hasAttributes: z.boolean().optional(),
  attributes: z.array(attributeSchema).optional()
});

export const updateSubcategorySchema = z.object({
  name: z.string()
    .min(2, 'Subcategory name must be at least 2 characters')
    .max(100, 'Subcategory name cannot exceed 100 characters')
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
  category: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID')
    .optional(),
  isActive: z.boolean().optional(),
  order: z.number()
    .int('Order must be an integer')
    .min(0, 'Order must be a positive number')
    .optional(),
  hasAttributes: z.boolean().optional(),
  attributes: z.array(attributeSchema).optional()
});

export const getSubcategoriesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID')
    .optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'order']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;
export type GetSubcategoriesQuery = z.infer<typeof getSubcategoriesSchema>;