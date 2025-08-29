import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { validate } from '@/middlewares/validation.middleware.js';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import ChatModal from '@models/chat/chat.model.js';
import { 
  createChatSchema, 
  getChatSchema, 
  deleteChatSchema, 
  getUserChatsSchema 
} from '@models/chat/chat.validators.js';

export const createChat = [
  validate(createChatSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { participants } = req.body;

    const existingChat = await ChatModal.findByParticipants(
      participants.map((id: string) => new Types.ObjectId(id))
    );

    if (existingChat) {
      return ApiResponse.success(res, existingChat, 'Chat already exists');
    }

    const chat = await ChatModal.createOrFindChat(
      participants.map((id: string) => new Types.ObjectId(id))
    );

    return ApiResponse.success(res, chat, 'Chat created successfully');
  }),
];

export const getUserChats = [
  validate(getUserChatsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    
    const chats = await ChatModal.findUserChats(userId);

    return ApiResponse.success(res, chats, 'Chats fetched successfully');
  }),
];

export const getSingleChat = [
  validate(getChatSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { chatId } = req.query;

    const chat = await ChatModal.findById(chatId)
      .populate({
        path: 'participants',
        select: 'displayName email isOnline profilePicture',
        populate: {
          path: 'profilePicture',
          select: 'url',
        },
      })
      .populate('last_message');

    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    return ApiResponse.success(res, chat, 'Chat fetched successfully');
  }),
];

export const deleteChat = [
  validate(deleteChatSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const chatId = req.params['id'];

    const chat = await ChatModal.findOne({
      _id: new Types.ObjectId(chatId),
      participants: userId,
    });

    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    await ChatModal.findByIdAndDelete(chat._id);

    return ApiResponse.success(res, null, 'Chat deleted successfully');
  }),
];