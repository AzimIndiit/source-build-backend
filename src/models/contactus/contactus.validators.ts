import { z } from 'zod';
import { ContactUsStatus } from './contactus.types.js';

/**
 * Create contact us submission validator
 */
export const createContactUsSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must not exceed 50 characters'),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email')
      .max(100, 'Email must not exceed 100 characters'),
    message: z
      .string()
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message must not exceed 1000 characters'),
  }),
});

/**
 * Update contact us ticket validator
 */
export const updateContactUsSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ContactUsStatus).optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must not exceed 500 characters')
      .optional(),
    resolvedBy: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
      .optional(),
  }),
});

/**
 * Contact us ID validator
 */
export const contactUsIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
});

/**
 * Contact us filter validator
 */
export const contactUsFilterSchema = z.object({
  query: z.object({
    status: z.nativeEnum(ContactUsStatus).optional(),
    email: z.string().email('Invalid email format').optional(),
    search: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    sort: z.string().optional(),
  }),
});

/**
 * Update status validator
 */
export const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
  body: z.object({
    status: z.nativeEnum(ContactUsStatus),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must not exceed 500 characters')
      .optional(),
  }),
});

/**
 * Add note validator
 */
export const addNoteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
  body: z.object({
    note: z
      .string()
      .trim()
      .min(1, 'Note is required')
      .max(500, 'Note must not exceed 500 characters'),
  }),
});

/**
 * Type exports for use in TypeScript
 */
export type CreateContactUsInput = z.infer<typeof createContactUsSchema>['body'];
export type UpdateContactUsInput = z.infer<typeof updateContactUsSchema>['body'];
export type ContactUsFilterInput = z.infer<typeof contactUsFilterSchema>['query'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
export type AddNoteInput = z.infer<typeof addNoteSchema>['body'];