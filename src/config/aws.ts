import { S3Client } from '@aws-sdk/client-s3';
import config from './index.js';
import logger from './logger.js';

/**
 * AWS S3 Client Configuration
 */

// Validate AWS configuration
const validateAWSConfig = () => {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.warn(`Missing AWS configuration: ${missing.join(', ')}. File uploads may not work properly.`);
    return false;
  }
  return true;
};

// Create S3 client instance
let s3Client: S3Client | null = null;

if (validateAWSConfig()) {
  s3Client = new S3Client({
    region: config.AWS.REGION || 'us-east-1',
    credentials: {
      accessKeyId: config.AWS.ACCESS_KEY_ID!,
      secretAccessKey: config.AWS.SECRET_ACCESS_KEY!,
    },
    maxAttempts: 3,
    requestHandler: {
      requestTimeout: 30000, // 30 seconds
    },
  });
  
  logger.info('AWS S3 client initialized successfully', {
    region: config.AWS.REGION,
    bucket: config.AWS.S3_BUCKET
  });
} else {
  logger.warn('AWS S3 client not initialized - missing configuration');
}

export const getS3Client = (): S3Client => {
  if (!s3Client) {
    throw new Error('AWS S3 client not initialized. Please check your AWS configuration.');
  }
  return s3Client;
};

export const getBucketName = (): string => {
  const bucketName = config.AWS.S3_BUCKET;
  if (!bucketName) {
    throw new Error('AWS S3 bucket name not configured');
  }
  return bucketName;
};

export const getRegion = (): string => {
  return config.AWS.REGION || 'us-east-1';
};

export default s3Client;