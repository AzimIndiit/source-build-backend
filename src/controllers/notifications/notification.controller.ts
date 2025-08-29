import { Request, Response } from 'express';
import { Types } from 'mongoose';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import { validate } from '@middlewares/validation.middleware.js';
import logger from '@config/logger.js';
import {
  notificationFilterSchema,
  notificationIdSchema,
  createNotificationSchema,
  NotificationFilterInput,
  CreateNotificationInput,
} from '@models/notification/notification.validators.js';
import { NotificationModal } from '@models/notification/index.js';

/**
 * List notifications for current user (paginated)
 */
export const listNotifications = [
  validate(notificationFilterSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const query: NotificationFilterInput = req.query as any;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    
    const filter: any = { userId };
    
    // Apply additional filters
    if (query.type) filter.type = query.type;
    if (query.isRead !== undefined) filter.isRead = query.isRead;
    if (query.status) filter.status = query.status;
    
    if (query.dateRange) {
      filter.createdAt = {};
      if (query.dateRange.start) {
        filter.createdAt.$gte = new Date(query.dateRange.start);
      }
      if (query.dateRange.end) {
        filter.createdAt.$lte = new Date(query.dateRange.end);
      }
    }
    
    const [notifications, total] = await Promise.all([
      NotificationModal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModal.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return ApiResponse.successWithPagination(
      res,
      notifications,
      {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      'Notifications retrieved successfully'
    );
  })
];

/**
 * Get single notification by ID
 */
export const getNotification = [
  validate(notificationIdSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid notification ID');
    }
    
    const notification = await NotificationModal.findOne({
      _id: id,
      userId
    });
    
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    
    return ApiResponse.success(res, notification, 'Notification retrieved successfully');
  })
];

/**
 * Mark a notification as read
 */
export const markAsRead = [
  validate(notificationIdSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid notification ID');
    }
    
    const notification = await NotificationModal.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    
    logger.info('Notification marked as read', { notificationId: id, userId });
    
    return ApiResponse.success(res, notification, 'Notification marked as read');
  })
];

/**
 * Mark a notification as unread
 */
export const markAsUnread = [
  validate(notificationIdSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid notification ID');
    }
    
    const notification = await NotificationModal.findOneAndUpdate(
      { _id: id, userId },
      { isRead: false },
      { new: true }
    );
    
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    
    logger.info('Notification marked as unread', { notificationId: id, userId });
    
    return ApiResponse.success(res, notification, 'Notification marked as unread');
  })
];

/**
 * Mark all notifications as read for current user
 */
export const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }
  
  const result = await NotificationModal.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
  
  logger.info('All notifications marked as read', { 
    userId, 
    count: result.modifiedCount 
  });
  
  return ApiResponse.success(
    res,
    { modifiedCount: result.modifiedCount },
    'All notifications marked as read'
  );
});

/**
 * Get unread notifications count
 */
export const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }
  
  const count = await NotificationModal.countDocuments({ 
    userId, 
    isRead: false 
  });
  
  return ApiResponse.success(
    res,
    { count },
    'Unread notifications count retrieved'
  );
});

/**
 * Delete a notification
 */
export const deleteNotification = [
  validate(notificationIdSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid notification ID');
    }
    
    const notification = await NotificationModal.findOneAndDelete({
      _id: id,
      userId
    });
    
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    
    logger.info('Notification deleted', { notificationId: id, userId });
    
    return ApiResponse.success(res, null, 'Notification deleted successfully');
  })
];

/**
 * Delete all notifications for current user
 */
export const deleteAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }
  
  const result = await NotificationModal.deleteMany({ userId });
  
  logger.info('All notifications deleted', { 
    userId, 
    count: result.deletedCount 
  });
  
  return ApiResponse.success(
    res,
    { deletedCount: result.deletedCount },
    'All notifications deleted successfully'
  );
});

/**
 * Get notification statistics for current user
 */
export const getNotificationStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }
  
  const stats = await NotificationModal.aggregate([
    {
      $match: { userId: new Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        },
        read: {
          $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
        },
        byType: {
          $push: {
            type: '$type',
            isRead: '$isRead'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        unread: 1,
        read: 1,
        readRate: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$read', '$total'] }, 100] }
          ]
        }
      }
    }
  ]);
  
  const result = stats[0] || {
    total: 0,
    unread: 0,
    read: 0,
    readRate: 0
  };
  
  return ApiResponse.success(
    res,
    result,
    'Notification statistics retrieved successfully'
  );
});

/**
 * Create a new notification (admin only)
 */
export const createNotification = [
  validate(createNotificationSchema),
  catchAsync(async (req: Request, res: Response) => {
    const notificationData: CreateNotificationInput = req.body;
    
    const notification = await NotificationModal.create({
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      meta: notificationData.meta,
      actionUrl: notificationData.actionUrl,
      status: notificationData.status || 'pending',
    });
    
    logger.info('Notification created', { 
      notificationId: notification._id,
      userId: notificationData.userId,
      type: notificationData.type 
    });
    
    return ApiResponse.created(res, notification, 'Notification created successfully');
  })
];

/**
 * Send bulk notifications (admin only)
 */
export const sendBulkNotifications = catchAsync(async (req: Request, res: Response) => {
  const { userIds, type, title, message, meta, actionUrl } = req.body;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest('User IDs array is required');
  }
  
  const notifications = await Promise.all(
    userIds.map(userId =>
      NotificationModal.create({
        userId,
        type,
        title,
        message,
        meta,
        actionUrl,
        status: 'pending',
      })
    )
  );
  
  logger.info('Bulk notifications sent', { 
    count: notifications.length,
    type 
  });
  
  return ApiResponse.success(
    res,
    { count: notifications.length },
    'Bulk notifications sent successfully'
  );
});

export default {
  listNotifications,
  getNotification,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  deleteAllNotifications,
  getNotificationStats,
  createNotification,
  sendBulkNotifications,
};