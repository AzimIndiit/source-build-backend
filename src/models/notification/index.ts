// Export the main model
export { default as NotificationModal } from './notification.model.js';

// Export types
export type {
  INotification,
  INotificationModel,
  INotificationMethods,
  NotificationType,
  NotificationStatus,
  CreateNotificationDTO,
  UpdateNotificationDTO,
  NotificationFilterDTO,
} from './notification.types.js';

// Export validators
export {
  createNotificationSchema,
  updateNotificationSchema,

} from './notification.validators.js';

// Export methods and statics
export {
  markAsRead,
  markAsUnread,
  updateStatus,
} from './notification.methods.js';

export { notificationStatics } from './notification.statics.js';
