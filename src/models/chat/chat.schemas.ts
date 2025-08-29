import { Schema } from 'mongoose';
import { IChat, IChatMethods, IChatModel } from './chat.types.js';

export const ChatSchema = new Schema<IChat, IChatModel, IChatMethods>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    last_message: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    unread_counts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ChatSchema.index({ participants: 1 });
ChatSchema.index({ updatedAt: -1 });
ChatSchema.index({ 'participants.0': 1, 'participants.1': 1 });