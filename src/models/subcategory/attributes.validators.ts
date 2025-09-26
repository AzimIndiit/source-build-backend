import { z } from 'zod'

// Input type enum
export const inputTypeEnum = z.enum([
  'text',
  'number',
  'dropdown',
  'multiselect',
  'boolean',
  'radio',
])

// Value schema for dropdown/multiselect/radio options
const valueSchema = z.object({
  value: z.string().trim().min(1, 'Value is required'),
  order: z.number().optional(),
})

// Create attribute schema
export const createAttributeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Attribute name is required')
    .max(100, 'Attribute name cannot exceed 100 characters'),
  inputType: inputTypeEnum,
  required: z.boolean().optional().default(false),
  values: z.array(valueSchema).optional(),
  order: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
})

// Update attribute schema (all fields optional except validators)
export const updateAttributeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Attribute name is required')
    .max(100, 'Attribute name cannot exceed 100 characters')
    .optional(),
  subcategory: z.string().trim().min(1, 'Subcategory is required').optional(),
  inputType: inputTypeEnum.optional(),
  required: z.boolean().optional(),
  values: z.array(valueSchema).optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
})

// Get attributes query schema
export const getAttributesSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  subcategory: z.string().optional(),
  inputType: inputTypeEnum.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'order', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Type exports
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>
export type GetAttributesQuery = z.infer<typeof getAttributesSchema>
