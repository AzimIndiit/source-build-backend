import { Types } from 'mongoose';
import { INotification, INotificationModel, NotificationType, NotificationStatus } from './notification.types.js';

export const notificationStatics = {
  /**
   * Find notifications by user ID
   */
  async findByUser(this: INotificationModel, userId: Types.ObjectId): Promise<INotification[]> {
    return this.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Find notifications by type
   */
  async findByType(this: INotificationModel, type: NotificationType): Promise<INotification[]> {
    return this.find({ type })
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Find notifications by status
   */
  async findByStatus(this: INotificationModel, status: NotificationStatus): Promise<INotification[]> {
    return this.find({ status })
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Find unread notifications by user ID
   */
  async findUnreadByUser(this: INotificationModel, userId: Types.ObjectId): Promise<INotification[]> {
    return this.find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(this: INotificationModel, userId: Types.ObjectId): Promise<void> {
    await this.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  },

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(this: INotificationModel, daysOld: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await this.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
      status: 'sent'
    });
  },

  /**
   * Get notification statistics
   */
  async getNotificationStats(this: INotificationModel, userId?: Types.ObjectId): Promise<any> {
    const matchStage: any = {};
    if (userId) {
      matchStage.userId = userId;
    }

    const stats = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          byType: {
            $push: '$type'
          },
          byStatus: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          unread: 1,
          byType: {
            $reduce: {
              input: '$byType',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $literal: {
                      $concat: ['$$this', ': ', { $toString: { $size: { $filter: { input: '$byType', cond: { $eq: ['$$this', '$$this'] } } } } }]
                    }
                  }
                ]
              }
            }
          },
          byStatus: {
            $reduce: {
              input: '$byStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $literal: {
                      $concat: ['$$this', ': ', { $toString: { $size: { $filter: { input: '$byStatus', cond: { $eq: ['$$this', '$$this'] } } } } }]
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      unread: 0,
      byType: {},
      byStatus: {}
    };
  }
};
