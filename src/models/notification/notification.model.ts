import { Schema, model } from 'mongoose';
import { 
  INotification, 
  INotificationModel,
  NotificationType,
  NotificationStatus
} from './notification.types.js';
import { 
  markAsRead,
  markAsUnread,
  updateStatus,
} from './notification.methods.js';
import { notificationStatics } from './notification.statics.js';

const NOTIFICATION_TYPES: NotificationType[] = [
  'NEW_ORDER',
  'ORDER_CANCELLED',
  'ORDER_CONFIRMED',
  'ORDER_DELIVERED',
  'PRODUCT_APPROVED',
  'PRODUCT_PRICE_UPDATE',
  'PRODUCT_OUT_OF_STOCK',
  'WELCOME'
];

const NOTIFICATION_STATUS: NotificationStatus[] = ['sent', 'failed', 'pending'];

const notificationSchema = new Schema<INotification, INotificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message: 'Invalid notification type',
      },
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    actionUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid action URL format',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: NOTIFICATION_STATUS,
        message: 'Invalid notification status',
      },
      default: 'sent',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }); // For cleanup operations

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for isRecent (within last 24 hours)
notificationSchema.virtual('isRecent').get(function() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return this.createdAt.getTime() > oneDayAgo;
});

// Instance methods
Object.assign(notificationSchema.methods, {
  markAsRead,
  markAsUnread,
  updateStatus,
});

// Static methods
Object.assign(notificationSchema.statics, notificationStatics);

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Validate actionUrl if provided
  if (this.actionUrl && !this.actionUrl.startsWith('/') && !this.actionUrl.startsWith('http')) {
    return next(new Error('Action URL must be a relative path or absolute URL'));
  }

  // Auto-update status for failed notifications
  if (this.isModified('status') && this.status === 'failed') {
    this.isRead = false; // Failed notifications should be marked as unread
  }

  next();
});

// Create and export the model
const Notification = model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification;
