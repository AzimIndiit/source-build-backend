import { z } from 'zod';
import { ReviewType, ReviewStatus } from './review.types.js';

export const createReviewSchema = z.object({
  type: z.nativeEnum(ReviewType),
  product: z.string().optional(),
  reviewee: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(2000),
  title: z.string().max(200).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().min(10).max(2000).optional(),
  images: z.array(z.string()).optional(),
});

export const reviewResponseSchema = z.object({
  comment: z.string().min(10).max(1000),
});

export const reviewStatusSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  reason: z.string().optional(),
});

export const reviewFilterSchema = z.object({
  type: z.nativeEnum(ReviewType).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
  rating: z.number().min(1).max(5).optional(),
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  reviewer: z.string().optional(),
  reviewee: z.string().optional(),
  order: z.string().optional(),
  product: z.string().optional(),
  isVerifiedPurchase: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(10),
  sort: z.string().optional(),
});

export const reviewHelpfulnessSchema = z.object({
  helpful: z.boolean(),
});