import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const createChatSchema = z.object({
  body: z.object({
    participants: z
      .array(objectIdSchema)
      .length(2, 'A one-to-one chat must have exactly two participants'),
  }),
});

export const getChatSchema = z.object({
  query: z.object({
    chatId: objectIdSchema,
  }),
});

export const deleteChatSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const getUserChatsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});