import { Types } from 'mongoose';
import { IMessage } from './message.types.js';
import { MessageStatus } from './message.types.js';

export async function markAsDelivered(this: IMessage): Promise<void> {
  if (this.status === MessageStatus.SENT) {
    this.status = MessageStatus.DELIVERED;
    this.delivered_at = new Date();
    await this.save();
  }
}

export async function markAsRead(this: IMessage): Promise<void> {
  if (this.status !== MessageStatus.READ) {
    this.status = MessageStatus.READ;
    this.read_at = new Date();
    if (!this.delivered_at) {
      this.delivered_at = new Date();
    }
    await this.save();
  }
}

export async function addAttachment(this: IMessage, attachmentId: Types.ObjectId): Promise<void> {
  if (!this.attachments) {
    this.attachments = [];
  }
  this.attachments.push(attachmentId);
  
  if (this.attachments.length > 0 && this.content) {
    this.message_type = 'mix' as any;
  } else if (this.attachments.length > 0) {
    this.message_type = 'file' as any;
  }
  
  await this.save();
}