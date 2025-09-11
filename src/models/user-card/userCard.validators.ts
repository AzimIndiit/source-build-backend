import { token } from 'morgan';
import { z } from 'zod';

/**
 * Validation schema for creating a card
 */
export const createCardSchema = z.object({
  token:z.string().min(1, 'Token is required'),
  cardholderName: z.string()
    .trim()
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(100, 'Cardholder name cannot exceed 100 characters'),
  isDefault: z.boolean().optional().default(false),
});

/**
 * Validation schema for updating a card
 */
export const updateCardSchema = z.object({
  cardholderName: z.string()
    .trim()
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(100, 'Cardholder name cannot exceed 100 characters')
    .optional(),
  isDefault: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});
