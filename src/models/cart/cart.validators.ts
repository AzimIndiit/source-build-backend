import { z } from 'zod'

// Validation schemas

export const addToCartSchema = z.object({

    productId: z.string().min(1, 'Product ID is required'),
    variantId: z.string().optional().transform(val => val === '' ? undefined : val),
    quantity: z.number().min(1).default(1),
})

export const updateCartItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    variantId: z.string().optional().transform(val => val === '' ? undefined : val),
    quantity: z.number().min(0, 'Quantity must be non-negative'),
})

export const removeFromCartSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    variantId: z.string().optional().transform(val => val === '' ? undefined : val),
})
