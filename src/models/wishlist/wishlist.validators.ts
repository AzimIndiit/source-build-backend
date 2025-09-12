import { z } from 'zod';

export const addToWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  notificationEnabled: z.boolean().optional(),
  priceAlert: z.object({
    targetPrice: z.number().min(0, 'Target price must be positive'),
    alertEnabled: z.boolean(),
  }).optional(),
});

export const removeFromWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export const updateWishlistItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  notificationEnabled: z.boolean().optional(),
  priceAlert: z.object({
    targetPrice: z.number().min(0, 'Target price must be positive'),
    alertEnabled: z.boolean(),
  }).optional().nullable(),
});

export const setPriceAlertSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  targetPrice: z.number().min(0, 'Target price must be positive'),
  alertEnabled: z.boolean().optional().default(true),
});

export const getWishlistSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.string().optional(),
}).optional();

export const checkProductInWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
export type RemoveFromWishlistInput = z.infer<typeof removeFromWishlistSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>;
export type SetPriceAlertInput = z.infer<typeof setPriceAlertSchema>;
export type GetWishlistInput = z.infer<typeof getWishlistSchema>;
export type CheckProductInWishlistInput = z.infer<typeof checkProductInWishlistSchema>;