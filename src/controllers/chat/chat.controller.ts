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
  getUserChatsSchema,
  getOrCreateChatSchema 
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
  validate(getUserChatsSchema, "query"),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    
    const chats = await ChatModal.findUserChats(userId);

    return ApiResponse.success(res, chats, 'Chats fetched successfully');
  }),
];

export const getSingleChat = [
  validate(getChatSchema, "query"),
  catchAsync(async (req: Request, res: Response) => {
    const { chatId } = req.query;

    const chat = await ChatModal.findById(chatId)
      .populate({
        path: 'participants',
        select: 'displayName email isOnline avatar',
      
      })
      .populate('lastMessage');

    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    return ApiResponse.success(res, chat, 'Chat fetched successfully');
  }),
];

export const getChatById = [
  validate(deleteChatSchema, "params"),
  catchAsync(async (req: Request, res: Response) => {
    const chatId = req.params['id'];
    const userId = new Types.ObjectId(req.user?.id);

    const chat = await ChatModal.findOne({
      _id: new Types.ObjectId(chatId),
      participants: userId,
    })
      .populate({
        path: 'participants',
        select: 'displayName email isOnline avatar',
      })
      .populate('lastMessage')
      .lean();

    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    // Add id field for frontend compatibility
    const chatWithId = {
      ...chat,
      id: chat._id.toString(),
    };

    return ApiResponse.success(res, chatWithId, 'Chat fetched successfully');
  }),
];

export const deleteChat = [
  validate(deleteChatSchema, "params"),
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

export const getOrCreateChat = [
  validate(getOrCreateChatSchema ,'body'),
  catchAsync(async (req: Request, res: Response) => {
    const { participantId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    // Create participants array with current user and target participant
    const participants = [userId, participantId].map(id => new Types.ObjectId(id));

    // Try to find existing chat
    let chat = await ChatModal.findByParticipants(participants);

    if (!chat) {
      // Create new chat if not found
      chat = await ChatModal.createOrFindChat(participants);
    }

    // Populate the chat data
    const populatedChat = await ChatModal.findById(chat._id)
      .populate({
        path: 'participants',
        select: 'displayName email isOnline avatar',
      })
      .populate('lastMessage')
      .lean();

    // Add id field for frontend compatibility
    const chatWithId = {
      ...populatedChat,
      id: populatedChat?._id?.toString() || chat._id.toString(),
    };

    return ApiResponse.success(
      res, 
      chatWithId, 
     'Chat found'
    );
  }),
];