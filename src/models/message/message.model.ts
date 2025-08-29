import { model } from 'mongoose';
import { IMessage, IMessageModel, IMessageMethods } from './message.types.js';
import { MessageSchema } from './message.schemas.js';
import * as messageMethods from './message.methods.js';
import * as messageStatics from './message.statics.js';

MessageSchema.methods.markAsDelivered = messageMethods.markAsDelivered;
MessageSchema.methods.markAsRead = messageMethods.markAsRead;
MessageSchema.methods.addAttachment = messageMethods.addAttachment;

MessageSchema.statics['findChatMessages'] = messageStatics.findChatMessages;
MessageSchema.statics['findUnreadMessages'] = messageStatics.findUnreadMessages;
MessageSchema.statics['markAllAsRead'] = messageStatics.markAllAsRead;

const Message = model<IMessage, IMessageModel>('Message', MessageSchema);

export default Message;