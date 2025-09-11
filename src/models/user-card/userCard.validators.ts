import { z } from 'zod';

/**
 * Validation schema for creating a card
 */
export const createCardSchema = z.object({
  cardNumber: z.string()
    .regex(/^[0-9]{13,19}$/, 'Card number must be between 13 and 19 digits')
    .min(1, 'Card number is required'),
  expiryMonth: z.number()
    .min(1, 'Expiry month must be between 1 and 12')
    .max(12, 'Expiry month must be between 1 and 12'),
  expiryYear: z.number()
    .min(new Date().getFullYear(), 'Expiry year must be current year or later')
    .max(new Date().getFullYear() + 20, 'Expiry year is too far in the future'),
  cvv: z.string()
    .regex(/^[0-9]{3,4}$/, 'CVV must be 3 or 4 digits')
    .min(1, 'CVV is required'),
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
