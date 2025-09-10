import { Types } from 'mongoose';
import { IChat } from './chat.types.js';

export async function updateLastMessage(this: IChat, messageId: Types.ObjectId): Promise<void> {
  this.lastMessage = messageId;
  await this.save();
}

export async function incrementUnreadCount(this: IChat, userId: string): Promise<void> {
  const currentCount = this.unreadCounts.get(userId) || 0;
  this.unreadCounts.set(userId, currentCount + 1);
  await this.save();
}

export async function resetUnreadCount(this: IChat, userId: string): Promise<void> {
  this.unreadCounts.set(userId, 0);
  await this.save();
}