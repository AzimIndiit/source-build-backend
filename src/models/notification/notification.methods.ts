import { INotification, INotificationMethods, NotificationStatus } from './notification.types.js';

/**
 * Mark notification as read
 */
export async function markAsRead(this: INotification): Promise<void> {
  this.isRead = true;
  await this.save();
}

/**
 * Mark notification as unread
 */
export async function markAsUnread(this: INotification): Promise<void> {
  this.isRead = false;
  await this.save();
}

/**
 * Update notification status
 */
export async function updateStatus(this: INotification, status: NotificationStatus): Promise<void> {
  this.status = status;
  await this.save();
}
