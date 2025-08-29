import { Schema } from 'mongoose';
import { IMessage, IMessageMethods, IMessageModel, MessageType, MessageStatus } from './message.types.js';

export const MessageSchema = new Schema<IMessage, IMessageModel, IMessageMethods>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    message_type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'File',
      },
    ],
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    delivered_at: {
      type: Date,
    },
    read_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

MessageSchema.index({ chat: 1, created_at: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ status: 1 });