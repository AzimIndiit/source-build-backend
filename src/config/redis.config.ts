import { Redis } from 'ioredis';
import config from './index.js';
import logger from './logger.js';

const redisOptions: any = {
  host: config.REDIS_HOST || 'localhost',
  port: config.REDIS_PORT || 6379,
  db: config.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

if (config.REDIS_PASSWORD) {
  redisOptions.password = config.REDIS_PASSWORD;
}

const redisClient = new Redis(redisOptions);



redisClient.on('connect', () => {
  logger.info('Redis client connected');
  console.log('\x1b[32m  ✅ Redis Connected: \x1b[0m' + `${config.REDIS_HOST}:${config.REDIS_PORT}`);
  console.log(`  📊 Redis Database: ${config.REDIS_DB || 0}\n`);
});

redisClient.on('error', (error :Error) => {
  logger.error('Redis client error:', error);
  console.log('\x1b[31m  ❌ Redis Connection Failed\x1b[0m');
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
  console.log('\x1b[33m  ⏳ Redis reconnecting...\x1b[0m');
});

export default redisClient;
