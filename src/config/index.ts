import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  SOCKET_CLIENT_URL: z.string().optional(),
  // Frontend Configuration
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // Database Configuration
  MONGODB_URI: z.string().url(),
  DB_NAME: z.string().min(1),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().optional(),
  
  // Email Configuration
  BREVO_API_KEY: z.string().optional(),
  
  // Cloud Storage Configuration (AWS S3)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Payment Gateway Configuration
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // LinkedIn OAuth Configuration
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CALLBACK_URL: z.string().optional(),

  // Redis Configuration (for caching)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number()).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number()).default('0'),
  REDIS_URL: z.string().optional(),
  
  // Kafka Configuration
  KAFKA_CLIENT_ID: z.string().default('source-build-backend'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_SSL: z.string().default('false'),
  KAFKA_USERNAME: z.string().optional(),
  KAFKA_PASSWORD: z.string().optional(),
  KAFKA_CONSUMER_GROUP_ID: z.string().default('source-build-backend-group'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number()).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number()).default('100'),
  
  // File Upload Configuration
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number()).default('10485760'), // 10MB
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/webp,application/pdf'),
  
  // Application Configuration
  APP_NAME: z.string().default('Source Build API'),
  APP_URL: z.string().url().optional(),
  API_VERSION: z.string().default('v1'),
    
  // Security Configuration
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  SESSION_SECRET: z.string().min(32).optional(),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  });

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Invalid environment configuration. Missing or invalid variables: ${missingVars}`);
    }
    throw error;
  }
};

// Export validated configuration
const validatedConfig = validateEnv();

export default {
  // Server Configuration
  NODE_ENV: validatedConfig.NODE_ENV,
  PORT: validatedConfig.PORT,
  SOCKET_CLIENT_URL: validatedConfig.SOCKET_CLIENT_URL,
  // Frontend Configuration
  FRONTEND_URL: validatedConfig.FRONTEND_URL,

  // Database Configuration
  MONGODB_URI: validatedConfig.MONGODB_URI,
  DB_NAME: validatedConfig.DB_NAME,
  
  // JWT Configuration
  JWT_SECRET: validatedConfig.JWT_SECRET,
  JWT_EXPIRES_IN: validatedConfig.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: validatedConfig.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: validatedConfig.JWT_REFRESH_EXPIRES_IN,
  
  // CORS Configuration
  CORS_ORIGIN: validatedConfig.CORS_ORIGIN,
  
  // Email Configuration
  BREVO: {
    API_KEY: validatedConfig.BREVO_API_KEY,
  },
  
  // Cloud Storage Configuration
  AWS: {
    ACCESS_KEY_ID: validatedConfig.AWS_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: validatedConfig.AWS_SECRET_ACCESS_KEY,
    REGION: validatedConfig.AWS_REGION,
    S3_BUCKET: validatedConfig.AWS_S3_BUCKET,
  },
  
  // Payment Gateway Configuration
  STRIPE: {
    SECRET_KEY: validatedConfig.STRIPE_SECRET_KEY,
    WEBHOOK_SECRET: validatedConfig.STRIPE_WEBHOOK_SECRET,
  },
  
  // Google OAuth Configuration
  GOOGLE_OAUTH: {
    CLIENT_ID: validatedConfig.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: validatedConfig.GOOGLE_CLIENT_SECRET,
    CALLBACK_URL: validatedConfig.GOOGLE_CALLBACK_URL,
  },
    
  // LinkedIn OAuth Configuration
  LINKEDIN_OAUTH: {
    CLIENT_ID: validatedConfig.LINKEDIN_CLIENT_ID,
    CLIENT_SECRET: validatedConfig.LINKEDIN_CLIENT_SECRET,
    CALLBACK_URL: validatedConfig.LINKEDIN_CALLBACK_URL,
  },
  
  
  // Redis Configuration
  REDIS_HOST: validatedConfig.REDIS_HOST,
  REDIS_PORT: validatedConfig.REDIS_PORT,
  REDIS_PASSWORD: validatedConfig.REDIS_PASSWORD,
  REDIS_DB: validatedConfig.REDIS_DB,
  REDIS_URL: validatedConfig.REDIS_URL,
  
  // Kafka Configuration
  KAFKA_CLIENT_ID: validatedConfig.KAFKA_CLIENT_ID,
  KAFKA_BROKERS: validatedConfig.KAFKA_BROKERS,
  KAFKA_SSL: validatedConfig.KAFKA_SSL,
  KAFKA_USERNAME: validatedConfig.KAFKA_USERNAME,
  KAFKA_PASSWORD: validatedConfig.KAFKA_PASSWORD,
  KAFKA_CONSUMER_GROUP_ID: validatedConfig.KAFKA_CONSUMER_GROUP_ID,
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: validatedConfig.RATE_LIMIT_WINDOW_MS,
    MAX_REQUESTS: validatedConfig.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // File Upload Configuration
  UPLOAD: {
    MAX_FILE_SIZE: validatedConfig.MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES: validatedConfig.ALLOWED_FILE_TYPES.split(','),
  },
  
  // Application Configuration
  APP: {
    NAME: validatedConfig.APP_NAME,
    URL: validatedConfig.APP_URL,
    VERSION: validatedConfig.API_VERSION,
  },
  
  // Security Configuration
  BCRYPT_SALT_ROUNDS: validatedConfig.BCRYPT_SALT_ROUNDS,
  SESSION_SECRET: validatedConfig.SESSION_SECRET,


   //Kafka Configuration
  KAFKA: {
    CLIENT_ID: validatedConfig.KAFKA_CLIENT_ID,
    BROKERS: validatedConfig.KAFKA_BROKERS,
    SSL: validatedConfig.KAFKA_SSL,
    USERNAME: validatedConfig.KAFKA_USERNAME,
    PASSWORD: validatedConfig.KAFKA_PASSWORD,
    CONSUMER_GROUP_ID: validatedConfig.KAFKA_CONSUMER_GROUP_ID,
  },

  
  // Logging Configuration
  LOG_LEVEL: validatedConfig.LOG_LEVEL,
} as const;