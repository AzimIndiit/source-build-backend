import { Kafka, SASLOptions, Mechanism } from 'kafkajs';
import config from './index.js';
import logger from './logger.js';

 const saslConfig: SASLOptions | Mechanism | undefined = config.KAFKA.USERNAME && config.KAFKA.PASSWORD ? {
  mechanism: 'plain',
  username: config.KAFKA.USERNAME,
  password: config.KAFKA.PASSWORD
} : undefined
 

const kafkaConfig: any = {
  clientId: 'chat-service',
  brokers: [config.KAFKA.BROKERS || 'localhost:9092'],
  ssl: config.KAFKA.SSL === 'true',
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
};

if (saslConfig) {
  kafkaConfig.sasl = saslConfig;
}

const kafka = new Kafka(kafkaConfig);
  

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const consumer = kafka.consumer({
  groupId: config.KAFKA.CONSUMER_GROUP_ID || 'source-build-backend-group',
});

let isProducerConnected = false;

producer.on('producer.connect', () => {
  logger.info('Kafka producer connected');
  isProducerConnected = true;
  console.log('\x1b[32m  ✅ Kafka Producer Connected: \x1b[0m' + (config.KAFKA.BROKERS || 'localhost:9092'));
  console.log(`  📊 Kafka Client ID: ${config.KAFKA.CLIENT_ID}\n`);
});

producer.on('producer.disconnect', () => {
  logger.warn('Kafka producer disconnected');
  isProducerConnected = false;
  console.log('\x1b[33m  ⚠️  Kafka Producer Disconnected\x1b[0m');
});

producer.on('producer.network.request_timeout', () => {
  logger.warn('Kafka producer network request timeout');
  console.log('\x1b[33m  ⏱️  Kafka Producer Timeout\x1b[0m');
});

consumer.on('consumer.connect', () => {
  logger.info('Kafka consumer connected');
  console.log('\x1b[32m  ✅ Kafka Consumer Connected: \x1b[0mGroup: ' + (config.KAFKA.CONSUMER_GROUP_ID || 'source-build-backend-group'));
});

consumer.on('consumer.disconnect', () => {
  logger.warn('Kafka consumer disconnected');
  console.log('\x1b[33m  ⚠️  Kafka Consumer Disconnected\x1b[0m');
});

export { producer, consumer, isProducerConnected };
