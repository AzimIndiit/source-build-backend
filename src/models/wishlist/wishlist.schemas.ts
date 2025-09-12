import { Schema } from 'mongoose';

export const priceAlertSchema = new Schema({
  targetPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  alertEnabled: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

export const wishlistItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  notificationEnabled: {
    type: Boolean,
    default: false,
  },
  priceAlert: {
    type: priceAlertSchema,
    required: false,
  },
}, { _id: false });