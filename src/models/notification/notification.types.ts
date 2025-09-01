import { Document, Types, Model } from 'mongoose';

export type NotificationType =
  | 'NEW_ORDER'
  | 'ORDER_CANCELLED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_DELIVERED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_PRICE_UPDATE'
  | 'PRODUCT_OUT_OF_STOCK' | 'WELCOME';

export type NotificationStatus = 'sent' | 'failed' | 'pending';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  meta?: Record<string, any>;
  actionUrl?: string;
  isRead: boolean;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationMethods {
  markAsRead(): Promise<void>;
  markAsUnread(): Promise<void>;
  updateStatus(status: NotificationStatus): Promise<void>;
}

export interface INotificationModel extends Model<INotification> {
  findByUser(userId: Types.ObjectId): Promise<INotification[]>;
  findByType(type: NotificationType): Promise<INotification[]>;
  findByStatus(status: NotificationStatus): Promise<INotification[]>;
  findUnreadByUser(userId: Types.ObjectId): Promise<INotification[]>;
  markAllAsRead(userId: Types.ObjectId): Promise<void>;
  deleteOldNotifications(daysOld: number): Promise<void>;
  getNotificationStats(userId?: Types.ObjectId): Promise<any>;
}

// DTOs for API operations
export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  meta?: Record<string, any>;
  actionUrl?: string;
  status?: NotificationStatus;
}

export interface UpdateNotificationDTO {
  title?: string;
  message?: string;
  meta?: Record<string, any>;
  actionUrl?: string;
  isRead?: boolean;
  status?: NotificationStatus;
}

export interface NotificationFilterDTO {
  type?: NotificationType;
  isRead?: boolean;
  status?: NotificationStatus;
  userId?: string;
  page?: number;
  limit?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}
