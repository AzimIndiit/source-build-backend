/**
 * Environment variable type definitions for TypeScript
 * This file extends the global NodeJS namespace to provide type safety for environment variables
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server Configuration
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      
      // Database Configuration
      MONGODB_URI: string;
      DB_NAME: string;
      
      // JWT Configuration
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      JWT_REFRESH_SECRET: string;
      JWT_REFRESH_EXPIRES_IN: string;
      
      // CORS Configuration
      CORS_ORIGIN?: string;
      
      // Email Configuration
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USERNAME?: string;
      SMTP_PASSWORD?: string;
      EMAIL_FROM?: string;
      
      // Cloud Storage Configuration (AWS S3)
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION?: string;
      AWS_S3_BUCKET_NAME?: string;
      
      // Payment Gateway Configuration
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      PAYPAL_CLIENT_ID?: string;
      PAYPAL_CLIENT_SECRET?: string;
      
      // Google OAuth Configuration
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      
      // Redis Configuration (for caching)
      REDIS_URL?: string;
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
      
      // File Upload Configuration
      MAX_FILE_SIZE?: string;
      ALLOWED_FILE_TYPES?: string;
      
      // Application Configuration
      APP_NAME?: string;
      APP_URL?: string;
      API_VERSION?: string;
      
      // Security Configuration
      BCRYPT_SALT_ROUNDS?: string;
      SESSION_SECRET?: string;
      
      // Logging Configuration
      LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
      
      // Testing Configuration
      TEST_MONGODB_URI?: string;
      
      // Development Configuration
      SWAGGER_ENABLED?: string;
      
      // Monitoring & Analytics
      SENTRY_DSN?: string;
      ANALYTICS_API_KEY?: string;
      
      // Third-party Integrations
      WEBHOOK_SECRET?: string;
      EXTERNAL_API_KEY?: string;
      EXTERNAL_API_URL?: string;
      
      // Social Media Configuration
      FACEBOOK_APP_ID?: string;
      FACEBOOK_APP_SECRET?: string;
      TWITTER_CONSUMER_KEY?: string;
      TWITTER_CONSUMER_SECRET?: string;
      
      // Push Notifications
      FCM_SERVER_KEY?: string;
      PUSH_NOTIFICATION_VAPID_PUBLIC_KEY?: string;
      PUSH_NOTIFICATION_VAPID_PRIVATE_KEY?: string;
      
      // Background Jobs
      QUEUE_REDIS_URL?: string;
      JOB_CONCURRENCY?: string;
      
      // Caching
      CACHE_TTL?: string;
      CACHE_MAX_ITEMS?: string;
      
      // Feature Flags
      FEATURE_ADVANCED_SEARCH?: string;
      FEATURE_REAL_TIME_NOTIFICATIONS?: string;
      FEATURE_ANALYTICS_TRACKING?: string;
    }
  }
}

// Export empty object to make this file a module
export {};

/**
 * Type definitions for configuration object
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN?: string;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  uri: string;
  name: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}

/**
 * JWT configuration interface
 */
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  algorithm?: string;
  issuer?: string;
  audience?: string;
}

/**
 * Email configuration interface
 */
export interface EmailConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from?: string;
  secure?: boolean;
}

/**
 * AWS S3 configuration interface
 */
export interface AWSConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucketName?: string;
}

/**
 * Payment configuration interface
 */
export interface PaymentConfig {
  stripe?: {
    secretKey?: string;
    webhookSecret?: string;
  };
  paypal?: {
    clientId?: string;
    clientSecret?: string;
    environment?: 'sandbox' | 'production';
  };
}

/**
 * OAuth configuration interface
 */
export interface OAuthConfig {
  google?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  facebook?: {
    appId?: string;
    appSecret?: string;
  };
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  name: string;
  url?: string;
  version: string;
  environment: string;
}