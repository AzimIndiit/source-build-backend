import { z } from 'zod';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order.types.js';

const ShippingAddressSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  address: z.string().min(1, 'Address is required').max(200),
  city: z.string().min(1, 'City is required').max(50),
  state: z.string().min(1, 'State is required').max(50),
  country: z.string().min(1, 'Country is required').max(50),
  zip: z.string().min(1, 'ZIP code is required').max(10),
  isDefault: z.boolean().optional(),
});

const OrderProductSchema = z.object({
  product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price cannot be negative'),
});

export const createOrderSchema = z.object({
    customer: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID').optional(),
    products: z.array(OrderProductSchema).min(1, 'At least one product is required'),
    shippingAddress: ShippingAddressSchema,
    billingAddress: ShippingAddressSchema.optional(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    deliveryInstructions: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
    estimatedDeliveryDate: z.string().datetime().optional(),
});

export const updateOrderSchema = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    driver: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid driver ID').optional(),
    shippingAddress: ShippingAddressSchema.optional(),
    deliveryInstructions: z.string().max(500).optional(),
    estimatedDeliveryDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
});

export const updateOrderStatusSchema = z.object({
    status: z.nativeEnum(OrderStatus),
    reason: z.string().max(500).optional(),
    location: z.string().max(200).optional(),
});

export const assignDriverSchema = z.object({
    driver: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid driver ID'),
});

export const markAsDeliveredSchema = z.object({
    proofOfDelivery: z.string().url('Invalid proof of delivery URL').optional(),
});

export const cancelOrderSchema = z.object({
    reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export const initiateRefundSchema = z.object({
    reason: z.string().min(1, 'Refund reason is required').max(500),
    amount: z.number().positive('Refund amount must be positive').optional(),
});

export const addReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().min(1, 'Review is required').max(1000),
});

export const orderFilterSchema = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    customer: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    driver: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    minAmount: z.string().transform(Number).optional(),
    maxAmount: z.string().transform(Number).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    search: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    sort: z.string().optional(),
});

export const orderIdSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID'),
});

export const orderNumberSchema = z.object({
    orderNumber: z.string().regex(/^ORD\d{12}$/, 'Invalid order number format'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type MarkAsDeliveredInput = z.infer<typeof markAsDeliveredSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type InitiateRefundInput = z.infer<typeof initiateRefundSchema>;
export type AddReviewInput = z.infer<typeof addReviewSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterSchema>