import { z } from 'zod';
import { ContentType } from './cms.model.js';

export const createCmsContentSchema = z.object({
  type: z.enum([
    ContentType.TERMS_CONDITIONS,
    ContentType.PRIVACY_POLICY,
    ContentType.ABOUT_US,
  ]),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content must not exceed 50000 characters'),
  isActive: z.boolean().optional().default(true),
});

export const updateCmsContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .optional(),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content must not exceed 50000 characters')
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateCmsContentDto = z.infer<typeof createCmsContentSchema>;
export type UpdateCmsContentDto = z.infer<typeof updateCmsContentSchema>;