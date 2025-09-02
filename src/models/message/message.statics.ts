import { Types } from 'mongoose';
import { IMessage, IMessageModel } from './message.types.js';

export async function findChatMessages(
  this: IMessageModel,
  chatId: Types.ObjectId,
  options: { page?: number; limit?: number } = {}
): Promise<IMessage[]> {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ chat: chatId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'displayName email')
    .populate('attachments', 'url mimetype originalname');
}

export async function findUnreadMessages(
  this: IMessageModel,
  chatId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IMessage[]> {
  return this.find({
    chat: chatId,
    sender: { $ne: userId },
    status: { $ne: 'read' },
  }).sort({ created_at: 1 });
}

export async function markAllAsRead(
  this: IMessageModel,
  chatId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<void> {
  await this.updateMany(
    {
      chat: chatId,
      sender: { $ne: userId },
      status: { $ne: 'read' },
    },
    {
      $set: {
        status: 'read',
        read_at: new Date(),
      },
    }
  );
}