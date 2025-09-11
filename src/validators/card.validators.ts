import { z } from 'zod';

// Schema for creating a card with Stripe token (the only secure method)
export const createCardSchema = z.object({
  token: z.string().min(1),
  cardholderName: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
});