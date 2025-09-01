import { z } from 'zod';

// Define notification type literals
const NotificationTypeEnum = z.enum([
  'NEW_ORDER',
  'ORDER_CANCELLED',
  'ORDER_CONFIRMED',
  'ORDER_DELIVERED',
  'PRODUCT_APPROVED',
  'PRODUCT_PRICE_UPDATE',
  'PRODUCT_OUT_OF_STOCK',
]);

// Define notification status literals
const NotificationStatusEnum = z.enum(['sent', 'failed', 'pending']);

/**
 * Create notification input validator
 */
export const createNotificationSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    type: NotificationTypeEnum,
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
    meta: z.record(z.any()).optional(),
    actionUrl: z.string().url('Invalid action URL').optional(),
    status: NotificationStatusEnum.optional().default('sent'),
  }),
});

/**
 * Update notification input validator
 */
export const updateNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
    message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters').optional(),
    meta: z.record(z.any()).optional(),
    actionUrl: z.string().url('Invalid action URL').optional(),
    isRead: z.boolean().optional(),
    status: NotificationStatusEnum.optional(),
  }),
});

/**
 * Notification ID validator
 */
export const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID'),
  }),
});

/**
 * Notification filter validator
 */
export const notificationFilterSchema = z.object({
  query: z.object({
    type: NotificationTypeEnum.optional(),
    isRead: z.string().transform(val => val === 'true').optional(),
    status: NotificationStatusEnum.optional(),
    userId: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
  }),
});

/**
 * Simple query validator for notifications list
 */
export const notificationQuerySchema = z.object({
  type: NotificationTypeEnum.optional(),
  isRead: z.string().transform(val => val === 'true').optional(),
  status: NotificationStatusEnum.optional(),
  userId: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('10'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Bulk notification validator
 */
export const bulkNotificationSchema = z.object({
  body: z.object({
    userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
    type: NotificationTypeEnum,
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
    meta: z.record(z.any()).optional(),
    actionUrl: z.string().url('Invalid action URL').optional(),
  }),
});

/**
 * Type exports for use in TypeScript
 */
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>['body'];
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>['body'];
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>['query'];
export type BulkNotificationInput = z.infer<typeof bulkNotificationSchema>['body'];