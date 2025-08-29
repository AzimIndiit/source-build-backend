import { Document, Model, Types } from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  MIX = 'mix',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface IMessageBase {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  content?: string;
  message_type: MessageType;
  attachments?: Types.ObjectId[];
  status: MessageStatus;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface IMessage extends IMessageBase, Document {
  _id: Types.ObjectId;
}

export interface IMessageMethods {
  markAsDelivered(): Promise<void>;
  markAsRead(): Promise<void>;
  addAttachment(attachmentId: Types.ObjectId): Promise<void>;
}

export interface IMessageStatics {
  findChatMessages(chatId: Types.ObjectId, options?: { page?: number; limit?: number }): Promise<IMessage[]>;
  findUnreadMessages(chatId: Types.ObjectId, userId: Types.ObjectId): Promise<IMessage[]>;
  markAllAsRead(chatId: Types.ObjectId, userId: Types.ObjectId): Promise<void>;
}

export interface IMessageModel extends Model<IMessage, {}, IMessageMethods>, IMessageStatics {}

export interface CreateMessageDTO {
  chat: Types.ObjectId;
  content: string;
  message_type?: MessageType;
  attachments?: Types.ObjectId[];
}

export interface UpdateMessageDTO {
  status?: MessageStatus;
  delivered_at?: Date;
  read_at?: Date;
}

export interface GetMessagesDTO {
  chatId: string;
  page?: number;
  limit?: number;
}