import { Types } from 'mongoose';
import { IChat, IChatModel } from './chat.types.js';

export async function findByParticipants(
  this: IChatModel,
  participants: Types.ObjectId[]
): Promise<IChat | null> {
  return this.findOne({
    participants: { $all: participants, $size: 2 },
  });
}

export async function findUserChats(
  this: IChatModel,
  userId: Types.ObjectId
): Promise<IChat[]> {
  return this.find({ participants: userId })
    .populate({
      path: 'participants',
      select: 'displayName email isOnline avatar',
    
    })
    .populate({
      path: 'last_message',
      populate: {
        path: 'attachments',
        select: 'url mimetype originalname',
      },
    })
    .sort({ updatedAt: -1 });
}

export async function createOrFindChat(
  this: IChatModel,
  participants: Types.ObjectId[]
): Promise<IChat> {
  const existingChat = await this.findByParticipants(participants);
  
  if (existingChat) {
    return existingChat;
  }

  const chat = new this({ participants });
  await chat.save();
  return chat;
}