import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { Types } from 'mongoose'
import config from '@/config/index.js'
import redisClient from '@/config/redis.config.js'
import { producer, isProducerConnected } from '@/config/kafka.config.js'
import logger from '@/config/logger.js'
import UserModal from '@/models/user/user.model.js'
import MessageModal from '@/models/message/message.model.js'
import ChatModal from '@/models/chat/chat.model.js'
import { MessageStatus } from '@/models/message/message.types.js'

// Types
interface SocketData {
  chatId: string
  senderId: string
  content: string
  messageType?: string
  attachments: any[]
  status: MessageStatus
  sentAt: Date
  createdAt: Date
  updatedAt: Date
  _id: string
}

interface ChatData {
  roomId: string
}

interface MessageData {
  messageId: string
}

let io: SocketIOServer | null = null

const initializeSocketServer = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.SOCKET_CLIENT_URL || ['http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:8081', '*'],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  })

  io.on('connection', handleConnection)
  return io
}

const sendToKafka = async (data: any): Promise<void> => {
  try {
    let connected = isProducerConnected
    if (!connected) {
      logger.info('Kafka producer not connected, attempting to reconnect...')
      await producer.connect()
      connected = true
    }

    await producer.send({
      topic: 'chat-messages',
      messages: [
        {
          value: JSON.stringify(data),
        },
      ],
    })
  } catch (error) {
    logger.error('Error sending message to Kafka:', error)

    // Store message in Redis for retry later (if Redis is available)
    try {
      await redisClient.lpush('failed_messages', JSON.stringify(data))
    } catch (redisError) {
      logger.error('Failed to store message in Redis:', redisError)
    }
  }
}

const handleConnection = async (socket: Socket): Promise<void> => {
  const userId = socket.handshake.query['userId'] as string

  if (!userId) {
    logger.warn('Socket connection without userId')
    return
  }

  logger.info('User connected with ID:', { userId, socketId: socket.id })

  socket.join(`user_${userId}_lobby`)

  // Only update user status if userId is a valid MongoDB ObjectId
  if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
    try {
      const updatedUser = await UserModal.findByIdAndUpdate(userId, { isOnline: true }, { new: true })
      
      // Check if user exists and is not a driver
      if (updatedUser && updatedUser.role !== 'driver') {
        socket.broadcast.emit('is_online', {
          userId,
          is_online: true,
        })
      }
    } catch (error) {
      logger.warn('Could not update user online status:', error)
    }
  } else {
    logger.info('Test connection - skipping user status update for non-ObjectId userId:', userId)
  }

  socket.on('join_chat', (data: ChatData) => joinChat(socket, userId, data))
  socket.on('leave_chat', (data: ChatData) => leaveChat(socket, userId, data))
  socket.on('send_message', (data: SocketData) => sendMessage(socket, userId, data))
  socket.on('mark_as_read', (data: MessageData) => markAsRead(userId, data))
  socket.on('mark_as_delivered', (data: MessageData) => markAsDelivered(userId, data))
  socket.on('mark_all_as_read', (data: ChatData) => markAllAsRead(socket, userId, data.roomId))
  socket.on('disconnect', () => handleDisconnect(userId, socket))
}

const markAllAsRead = async (socket: Socket, chatId: string, userId: string): Promise<void> => {
  try {
    await MessageModal.updateMany(
      {
        chat: new Types.ObjectId(chatId),
        sender: { $ne: new Types.ObjectId(userId) },
        status: { $ne: MessageStatus.READ },
      },
      {
        status: MessageStatus.READ,
        readAt: new Date(),
      }
    )

    await ChatModal.findByIdAndUpdate(chatId, { [`unread_counts.${userId}`]: 0 })

    const chatResult = await ChatModal.findById(chatId)
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

    if (chatResult) {
      socket?.broadcast?.emit('update_unread_count', chatResult)
    }
  } catch (error) {
    logger.error('Error marking all messages as read:', error)
    socket.emit('error', { message: 'Failed to mark messages as read' })
  }
}

const leaveChat = (socket: Socket, userId: string, data: ChatData): void => {
  const { roomId } = data
  socket.leave(roomId)
  logger.info(`User ${userId} left chat: ${roomId}`)
}

const joinChat = (socket: Socket, userId: string, data: ChatData): void => {
  const { roomId } = data
  socket.join(roomId)
  logger.info(`User ${userId} joined chat room: ${roomId}`)
  markAllAsRead(socket, roomId, userId)
}

const sendMessage = async (socket: Socket, _userId: string, data: SocketData): Promise<void> => {
  try {
    const tempMessage: any = {
      chatId: data.chatId,
      message: {
        sender: data.senderId,
        content: data.content,
        messageType: data.messageType || 'text',
        attachments: data.attachments && data.attachments.length > 0 ? data.attachments.map((v) => v._id) : [],
        status: 'sent',
        sentAt: data.sentAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    }

    // Save temporarily in Redis (temporary ID: timestamp)
    const tempId = data._id

    try {
      await redisClient.hset(
        `chat:${tempMessage.chatId}:messages`,
        tempId,
        JSON.stringify(tempMessage.message)
      )
    } catch (redisError) {
      logger.warn('Redis not available, continuing without caching:', redisError)
    }

    tempMessage.tempId = tempId
    console.log('tempMessage', tempMessage)
    // Publish to Kafka
    await sendToKafka(tempMessage)
  } catch (error) {
    logger.error('Error sending message:', error)
    socket.emit('error', { message: 'Failed to send message' })
  }
}

const markAsDelivered = async (_userId: string, data: MessageData): Promise<void> => {
  try {
    const { messageId } = data
    logger.info('Marking message as delivered:', { messageId })
    
    const message = await MessageModal.findById(messageId)
    if (message && message.status !== MessageStatus.DELIVERED) {
      message.status = MessageStatus.DELIVERED
      message.deliveredAt = new Date()
      
      logger.info('Saving message with delivered status:', { 
        messageId: message._id,
        oldStatus: message.status,
        newStatus: MessageStatus.DELIVERED,
        deliveredAt: message.deliveredAt
      })
      
      let result = await message.save()

      result = await result.populate('attachments', 'url mimetype originalname')
      result = await result.populate('sender', 'displayName email isOnline avatar')
      logger.info('Message marked as delivered in database')

      // Update Redis cache (with error handling)
      try {
        await redisClient.hset(
          `chat:${message.chat}:messages`,
          message._id.toString(),
          JSON.stringify(message)
        )
      } catch (redisError) {
        logger.warn('Redis cache update failed:', redisError)
      }
      
      // Emit the update
      if (io) {
        const roomName = message.chat.toString()
        logger.info(`Emitting message_delivered to room ${roomName}`)
        io.to(roomName).emit('message_delivered', result)
      } else {
        logger.error('Socket.IO instance not available for message_delivered event')
      }
    } else {
      logger.info('Message not found or already delivered:', { messageId, status: message?.status })
    }
  } catch (error) {
    logger.error('Error marking message as delivered:', error)
  }
}

const markAsRead = async (userId: string, data: MessageData): Promise<void> => {
  try {
    const { messageId } = data
    const message = await MessageModal.findById(messageId)
    if (message) {
      message.readAt = new Date()
      message.status = MessageStatus.READ
      let result = await message.save()
      result = await result.populate('attachments', 'url mimetype originalname')

      // Update Redis cache
      await redisClient.hset(
        `chat:${message.chat}:messages`,
        message._id.toString(),
        JSON.stringify(message)
      )

      if (io) {
        io.to(message.chat.toString()).emit('message_read', result)
      }

      await ChatModal.findByIdAndUpdate(message.chat, {
        [`unread_counts.${userId}`]: 0,
      })
    }
  } catch (error) {
    logger.error('Error marking message as read:', error)
  }
}

const handleDisconnect = async (userId: string, socket: Socket): Promise<void> => {
  logger.info('User disconnected:', { userId, socketId: socket.id })

  // Only update user status if userId is a valid MongoDB ObjectId
  if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
    try {
      const updatedUser = await UserModal.findByIdAndUpdate(userId, { isOnline: false }, { new: true })

      // Check if user exists and is not a driver
      if (updatedUser && updatedUser.role !== 'driver') {
        socket.broadcast.emit('is_online', {
          userId,
          is_online: false,
        })
      }
    } catch (error) {
      logger.warn('Could not update user offline status:', error)
    }
  }
}

const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io is not initialized. Call initializeSocketServer(server) first.')
  }
  return io
}

export { initializeSocketServer, getIO }
