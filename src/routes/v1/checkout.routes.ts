import { Router } from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  cancelPayment,
  getPaymentStatus,
  retryPayment,
} from '../../controllers/checkout/checkout.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createPaymentIntentSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    title: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    image: z.string().url(),
    color: z.string().optional(),
    seller: z.object({
      id: z.string(),
      businessName: z.string(),
    }).optional(),
  })),
  deliveryMethod: z.enum(['pickup', 'delivery', 'shipping']),
  deliveryAddress: z.object({
    name: z.string().min(1),
    phone: z.union([z.string().min(1), z.literal('')]).transform(val => val === '' ? undefined : val).optional(),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
  paymentCardId: z.string().optional(),
  totals: z.object({
    subtotal: z.number().positive(),
    deliveryFee: z.number().min(0),
    tax: z.number().min(0),
    discount: z.number().min(0),
    total: z.number().positive(),
  }),
  notes: z.union([z.string(), z.literal('')]).optional(),
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  orderId: z.string(),
});

const cancelPaymentSchema = z.object({
  paymentIntentId: z.string(),
  orderId: z.string(),
});

const retryPaymentSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string(),
});

// All routes require authentication
router.use(authenticate);

// Create payment intent
router.post(
  '/create-payment-intent',
  validate(createPaymentIntentSchema, 'body'),
  createPaymentIntent
);

// Confirm payment
router.post(
  '/confirm-payment',
  validate(confirmPaymentSchema, 'body'),
  confirmPayment
);

// Cancel payment
router.post(
  '/cancel-payment',
  validate(cancelPaymentSchema, 'body'),
  cancelPayment
);

// Get payment status
router.get('/payment-status/:paymentIntentId', getPaymentStatus);

// Retry payment with different payment method
router.post(
  '/retry-payment',
  validate(retryPaymentSchema, 'body'),
  retryPayment
);

export default router;