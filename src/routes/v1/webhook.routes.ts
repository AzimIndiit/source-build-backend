import { Router } from 'express';
import { handleStripeWebhook } from '../../controllers/webhook/stripe.webhook.controller.js';
import express from 'express';

const router = Router();

// Stripe webhook endpoint
// Note: This needs raw body, so it should be registered before body parser middleware
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;