import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { validate } from '@/middlewares/validation.middleware.js';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import MessageModal from '@models/message/message.model.js';
import ChatModal from '@models/chat/chat.model.js';
import { 
  createMessageSchema, 
  getMessagesSchema,
  updateMessageStatusSchema,
  markAllAsReadSchema
} from '@models/message/message.validators.js';
import { MessageType } from '@models/message/message.types.js';

export const sendMessage = [
  validate(createMessageSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { chat, content, message_type = MessageType.TEXT, attachments } = req.body;
    const senderId = new Types.ObjectId(req.user?.id);

    const chatDoc = await ChatModal.findById(chat);
    if (!chatDoc) {
      throw ApiError.notFound('Chat not found');
    }

    const isParticipant = chatDoc.participants.some(
      (participant) => participant.toString() === senderId.toString()
    );

    if (!isParticipant) {
      throw ApiError.forbidden('You are not a participant in this chat');
    }

    const message = await MessageModal.create({
      chat: new Types.ObjectId(chat),
      sender: senderId,
      content,
      message_type,
      attachments: attachments?.map((id: string) => new Types.ObjectId(id)),
      sent_at: new Date(),
    });

    await message.populate('sender', 'displayName email');
    await message.populate('attachments', 'url mimetype originalname');

    await chatDoc.updateLastMessage(message._id);

    const otherParticipant = chatDoc.participants.find(
      (p) => p.toString() !== senderId.toString()
    );
    if (otherParticipant) {
      await chatDoc.incrementUnreadCount(otherParticipant.toString());
    }

    return ApiResponse.created(res, message, 'Message sent successfully');
  }),
];

export const getMessages = [
  validate(getMessagesSchema,'query'),
  catchAsync(async (req: Request, res: Response) => {
    const { chatId, page = '1', limit = '10' } = req.query;

    const messages = await MessageModal.findChatMessages(
      new Types.ObjectId(chatId as string),
      { 
        page: parseInt(page as string), 
        limit: parseInt(limit as string) 
      }
    );

    const reversedMessages = messages.reverse();

    return ApiResponse.success(res, reversedMessages, 'Messages fetched successfully');
  }),
];

export const updateMessageStatus = [
  validate(updateMessageStatusSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const message = await MessageModal.findById(id);
    
    if (!message) {
      throw ApiError.notFound('Message not found');
    }

    if (status === 'delivered') {
      await message.markAsDelivered();
    } else if (status === 'read') {
      await message.markAsRead();
    }

    return ApiResponse.success(res, message, 'Message status updated successfully');
  }),
];

export const markAllAsRead = [
  validate(markAllAsReadSchema,'body'),
  catchAsync(async (req: Request, res: Response) => {
    const { chatId } = req.body;
    const userId = new Types.ObjectId(req.user?.id);

    await MessageModal.markAllAsRead(
      new Types.ObjectId(chatId),
      userId
    );

    const chat = await ChatModal.findById(chatId);
    if (chat) {
      await chat.resetUnreadCount(userId.toString());
    }

    return ApiResponse.success(res, null, 'All messages marked as read');
  }),
];