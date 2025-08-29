import { producer, consumer } from '../config/kafka.config.js';
import logger from '../config/logger.js';
import { ProducerRecord, EachMessagePayload } from 'kafkajs';

export interface KafkaMessage {
  topic: string;
  messages: Array<{
    key?: string;
    value: string | Buffer;
    partition?: number;
    headers?: Record<string, string | Buffer | undefined>;
  }>;
}

export enum KafkaTopics {
  USER_EVENTS = 'user-events',
  ORDER_EVENTS = 'order-events',
  PRODUCT_EVENTS = 'product-events',
  PAYMENT_EVENTS = 'payment-events',
  NOTIFICATION_EVENTS = 'notification-events',
  CHAT_MESSAGES = 'chat-messages',
  DRIVER_LOCATION = 'driver-location',
  ANALYTICS_EVENTS = 'analytics-events',
}

class KafkaService {
  private isProducerConnected = false;
  private isConsumerConnected = false;
  private messageHandlers: Map<string, (message: EachMessagePayload) => Promise<void>> = new Map();

  async initializeProducer(): Promise<void> {
    try {
      await producer.connect();
      this.isProducerConnected = true;
      logger.info('Kafka producer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka producer:', error);
      throw error;
    }
  }

  async initializeConsumer(topics: string[]): Promise<void> {
    try {
      await consumer.connect();
      await consumer.subscribe({ topics, fromBeginning: false });
      this.isConsumerConnected = true;
      
      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          logger.debug(`Received message from topic ${topic}`, {
            partition,
            offset: message.offset,
            key: message.key?.toString(),
          });

          const handler = this.messageHandlers.get(topic);
          if (handler) {
            try {
              await handler(payload);
            } catch (error) {
              logger.error(`Error processing message from topic ${topic}:`, error);
            }
          }
        },
      });

      logger.info('Kafka consumer initialized successfully', { topics });
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer:', error);
      throw error;
    }
  }

  async sendMessage(data: KafkaMessage): Promise<void> {
    if (!this.isProducerConnected) {
      await this.initializeProducer();
    }

    try {
      const record: ProducerRecord = {
        topic: data.topic,
        messages: data.messages.map(msg => ({
          ...msg,
          value: typeof msg.value === 'string' ? Buffer.from(msg.value) : msg.value,
        })),
      };

      await producer.send(record);
      logger.debug(`Message sent to topic ${data.topic}`);
    } catch (error) {
      logger.error(`Failed to send message to topic ${data.topic}:`, error);
      throw error;
    }
  }

  async sendBatch(records: ProducerRecord[]): Promise<void> {
    if (!this.isProducerConnected) {
      await this.initializeProducer();
    }

    try {
      await producer.sendBatch({ 
        topicMessages: records.map(record => ({
          ...record,
          messages: record.messages.map(msg => ({
            ...msg,
            value: typeof msg.value === 'string' ? Buffer.from(msg.value) : msg.value,
          })),
        }))
      });
      logger.debug(`Batch messages sent to ${records.length} topics`);
    } catch (error) {
      logger.error('Failed to send batch messages:', error);
      throw error;
    }
  }

  registerHandler(topic: string, handler: (message: EachMessagePayload) => Promise<void>): void {
    this.messageHandlers.set(topic, handler);
    logger.info(`Handler registered for topic: ${topic}`);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isProducerConnected) {
        await producer.disconnect();
        this.isProducerConnected = false;
        logger.info('Kafka producer disconnected');
      }

      if (this.isConsumerConnected) {
        await consumer.disconnect();
        this.isConsumerConnected = false;
        logger.info('Kafka consumer disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }

  async publishUserEvent(userId: string, eventType: string, data: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.USER_EVENTS,
      messages: [{
        key: userId,
        value: JSON.stringify({
          userId,
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishOrderEvent(orderId: string, eventType: string, data: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.ORDER_EVENTS,
      messages: [{
        key: orderId,
        value: JSON.stringify({
          orderId,
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishProductEvent(productId: string, eventType: string, data: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.PRODUCT_EVENTS,
      messages: [{
        key: productId,
        value: JSON.stringify({
          productId,
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishPaymentEvent(paymentId: string, eventType: string, data: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.PAYMENT_EVENTS,
      messages: [{
        key: paymentId,
        value: JSON.stringify({
          paymentId,
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishNotificationEvent(userId: string, notificationType: string, data: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.NOTIFICATION_EVENTS,
      messages: [{
        key: userId,
        value: JSON.stringify({
          userId,
          notificationType,
          data,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishChatMessage(roomId: string, message: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.CHAT_MESSAGES,
      messages: [{
        key: roomId,
        value: JSON.stringify({
          roomId,
          ...message,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishDriverLocation(driverId: string, location: { lat: number; lng: number }): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.DRIVER_LOCATION,
      messages: [{
        key: driverId,
        value: JSON.stringify({
          driverId,
          location,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishAnalyticsEvent(eventName: string, data: any): Promise<void> {
    await this.sendMessage({
      topic: KafkaTopics.ANALYTICS_EVENTS,
      messages: [{
        key: eventName,
        value: JSON.stringify({
          eventName,
          data,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  getProducerStatus(): boolean {
    return this.isProducerConnected;
  }

  getConsumerStatus(): boolean {
    return this.isConsumerConnected;
  }
}

export default new KafkaService();