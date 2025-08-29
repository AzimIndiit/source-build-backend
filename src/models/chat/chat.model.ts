import { model } from 'mongoose';
import { IChat, IChatModel, IChatMethods } from './chat.types.js';
import { ChatSchema } from './chat.schemas.js';
import * as chatMethods from './chat.methods.js';
import * as chatStatics from './chat.statics.js';

ChatSchema.methods.updateLastMessage = chatMethods.updateLastMessage;
ChatSchema.methods.incrementUnreadCount = chatMethods.incrementUnreadCount;
ChatSchema.methods.resetUnreadCount = chatMethods.resetUnreadCount;

ChatSchema.statics['findByParticipants'] = chatStatics.findByParticipants;
ChatSchema.statics['findUserChats'] = chatStatics.findUserChats;
ChatSchema.statics['createOrFindChat'] = chatStatics.createOrFindChat;

const ChatModal = model<IChat, IChatModel>('Chat', ChatSchema);

export default ChatModal;