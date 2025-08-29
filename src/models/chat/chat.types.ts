import { Document, Model, Types } from 'mongoose';

export interface IChatBase {
  participants: Types.ObjectId[];
  last_message?: Types.ObjectId;
  unread_counts: Map<string, number>;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChat extends IChatBase, Document {
  _id: Types.ObjectId;
}

export interface IChatMethods {
  updateLastMessage(messageId: Types.ObjectId): Promise<void>;
  incrementUnreadCount(userId: string): Promise<void>;
  resetUnreadCount(userId: string): Promise<void>;
}

export interface IChatStatics {
  findByParticipants(participants: Types.ObjectId[]): Promise<IChat | null>;
  findUserChats(userId: Types.ObjectId): Promise<IChat[]>;
  createOrFindChat(participants: Types.ObjectId[]): Promise<IChat>;
}

export interface IChatModel extends Model<IChat, {}, IChatMethods>, IChatStatics {}

export interface CreateChatDTO {
  participants: Types.ObjectId[];
}

export interface UpdateChatDTO {
  last_message?: Types.ObjectId;
  unread_counts?: Map<string, number>;
  is_active?: boolean;
}