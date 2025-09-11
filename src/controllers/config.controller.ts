import { Request, Response } from 'express';
import catchAsync from '@/utils/catchAsync.js';
import ApiResponse from '@/utils/ApiResponse.js';
import config from '@/config/index.js';

/**
 * Get public configuration for frontend
 * This endpoint provides non-sensitive configuration that the frontend needs
 */
export const getPublicConfig = catchAsync(async (req: Request, res: Response) => {
  const publicConfig = {
    stripe: {
      publishableKey: config.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
      apiVersion: '2023-10-16', // Stripe API version
    },
    environment: config.NODE_ENV,
    features: {
      enablePayments: true,
      enableChat: true,
      enableNotifications: true,
    },
  };

  return ApiResponse.success(res, publicConfig, 'Configuration fetched successfully');
});

export default {
  getPublicConfig,
};