import { z } from 'zod';
import { Types } from 'mongoose';
import { MessageType } from './message.types.js';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const createMessageSchema = z.object({
  body: z.object({
    chat: objectIdSchema,
    content: z.string().min(1, 'Message content is required'),
    message_type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT),
    attachments: z.array(objectIdSchema).optional(),
  }),
});

export const getMessagesSchema = z.object({
  query: z.object({
    chatId: objectIdSchema,
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
  }),
});

export const updateMessageStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(['delivered', 'read']),
  }),
});

export const markAllAsReadSchema = z.object({
  body: z.object({
    chatId: objectIdSchema,
  }),
});