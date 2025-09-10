import { EachMessagePayload } from 'kafkajs';
import logger from '@/config/logger.js';
import MessageModal from '@/models/message/message.model.js';
import ChatModal from '@/models/chat/chat.model.js';
import { getIO } from '@/services/socket.service.js';
import kafkaService, { KafkaTopics } from '@/services/kafka.service.js';

/**
 * Handle user events from Kafka
 */
export const handleUserEvent = async (payload: EachMessagePayload): Promise<void> => {
  const message = JSON.parse(payload.message.value?.toString() || '{}');
  logger.info('User event received:', message);
  
  // TODO: Add user event processing logic here
};

/**
 * Handle order events from Kafka
 */
export const handleOrderEvent = async (payload: EachMessagePayload): Promise<void> => {
  const message = JSON.parse(payload.message.value?.toString() || '{}');
  logger.info('Order event received:', message);
  
  // TODO: Add order event processing logic here
};

/**
 * Handle notification events from Kafka
 */
export const handleNotificationEvent = async (payload: EachMessagePayload): Promise<void> => {
  const message = JSON.parse(payload.message.value?.toString() || '{}');
  logger.info('Notification event received:', message);
  
  // TODO: Add notification event processing logic here
};

/**
 * Handle chat messages from Kafka
 */
export const handleChatMessage = async (payload: EachMessagePayload): Promise<void> => {
  const message = JSON.parse(payload.message.value?.toString() || '{}');
  logger.info('Chat message received from Kafka:', message);
  
  try {
    // Save message to database
    const newMessage = await MessageModal.create({
      chat: message.chatId,
      sender: message.message.sender,
      content: message.message.content,
      messageType: message.message.messageType || 'text',
      attachments: message.message.attachments || [],
      status: message.message.status || 'sent',
      sentAt: message.message.sentAt || new Date(),
    });
    
    // Populate the message with attachments and sender
    await newMessage.populate('attachments', 'url mimetype originalname');
    await newMessage.populate('sender', 'displayName email isOnline avatar');
    
    // Update chat's last message and unread counts
    const chat = await ChatModal.findByIdAndUpdate(
      message.chatId,
      {
        lastMessage: newMessage._id,
        lastMessageAt: new Date(),
        $inc: { [`unreadCounts.${message.message.sender}`]: 0 }
      },
      { new: true }
    );
    
    // Get all participants except sender and update unread counts
    if (chat && chat.participants) {
      for (const participantId of chat.participants) {
        if (participantId.toString() !== message.message.sender) {
          await ChatModal.findByIdAndUpdate(
            message.chatId,
            { $inc: { [`unreadCounts.${participantId}`]: 1 } }
          );
        }
      }
    }
    
    // Emit the saved message to all connected clients in the chat room
    const io = getIO();
    const messageToEmit = {
      _id: newMessage._id.toString(),
      chat: newMessage.chat,
      sender: newMessage.sender,
      content: newMessage.content,
      messageType: newMessage.messageType,
      attachments: newMessage.attachments,
      status: newMessage.status,
      sentAt: newMessage.sentAt,
      deliveredAt: newMessage.deliveredAt,
      readAt: newMessage.readAt,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
      tempId: message.tempId
    };
    const chatResult = await ChatModal.findById( message.chatId)
      .populate({
        path: 'participants',
        select: 'displayName email isOnline avatar',
      
      })
      .populate({
        path: 'lastMessage',

      })
    // Emit to the chat room
    const roomName = message.chatId.toString();
    
    // Check if room exists and has members
    const room = io.sockets.adapter.rooms.get(roomName);
    if (room && room.size > 0) {
      io.to(roomName).emit('new_message', messageToEmit);
      io.emit('update_unread_count', chatResult);
      logger.info(`Emitted new_message to room: ${roomName}`, {
        messageId: newMessage._id.toString(),
        tempId: message.tempId,
        roomMembers: room.size 
      });

    } else {
      logger.warn(`Room ${roomName} has no members, emitting to all sockets as fallback`);
      
      // Fallback: emit to all connected sockets (they will filter by chatId)
      

      io.emit('update_unread_count', chatResult);
      io.emit('new_message', messageToEmit);
       
    
    }
    
    logger.info('Chat message processed and saved:', {
      messageId: newMessage._id,
      chatId: message.chatId,
      tempId: message.tempId
    });
  } catch (error) {
    logger.error('Error processing chat message from Kafka:', error);
  }
};

/**
 * Initialize all Kafka handlers
 */
export const initializeKafkaHandlers = async (): Promise<void> => {
  try {
    // Initialize Kafka producer
    await kafkaService.initializeProducer();
    
    // Initialize Kafka consumer with topics to subscribe
    const topics = Object.values(KafkaTopics);
    await kafkaService.initializeConsumer(topics);
    
    // Register message handlers for different topics
    kafkaService.registerHandler(KafkaTopics.USER_EVENTS, handleUserEvent);
    kafkaService.registerHandler(KafkaTopics.ORDER_EVENTS, handleOrderEvent);
    kafkaService.registerHandler(KafkaTopics.NOTIFICATION_EVENTS, handleNotificationEvent);
    kafkaService.registerHandler(KafkaTopics.CHAT_MESSAGES, handleChatMessage);
    
    logger.info('Kafka services initialized successfully');
    console.log('\x1b[32m  ✅ Kafka Services Initialized\x1b[0m');
    console.log(`  📊 Kafka Topics Subscribed: ${topics.length} topics\n`);
  } catch (error) {
    logger.warn('Kafka connection failed, continuing without event streaming:', error);
    console.log('\x1b[33m  ⚠️  Kafka Not Available - Running without event streaming\x1b[0m\n');
  }
};

export default {
  handleUserEvent,
  handleOrderEvent,
  handleNotificationEvent,
  handleChatMessage,
  initializeKafkaHandlers
};