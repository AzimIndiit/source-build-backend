import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '@config/index.js'; 

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom log format function
 */
const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  customFormat
);

/**
 * File format for production
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create logs directory
 */
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Daily rotate file transport for error logs
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  format: fileFormat,
  maxFiles: '30d', // Keep logs for 30 days
  maxSize: '10m', // Max 10MB per file
  zippedArchive: true, // Compress old files
});

/**
 * Daily rotate file transport for combined logs
 */
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  format: fileFormat,
  maxFiles: '30d',
  maxSize: '10m',
  zippedArchive: true,
});

/**
 * Daily rotate file transport for access logs
 */
const accessFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  format: fileFormat,
  maxFiles: '30d',
  maxSize: '10m',
  zippedArchive: true,
});

/**
 * Console transport configuration
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
});

/**
 * Create winston logger instance
 */
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  defaultMeta: {
    service: config.APP.NAME,
    environment: config.NODE_ENV,
  },
  transports: [
    // Console output
    consoleTransport,
    
    // File outputs (only in production or when LOG_FILES is enabled)
    ...(config.NODE_ENV === 'production' || process.env.LOG_FILES === 'true' 
      ? [errorFileTransport, combinedFileTransport] 
      : []
    ),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    consoleTransport,
    ...(config.NODE_ENV === 'production' 
      ? [new winston.transports.File({ 
          filename: path.join(logsDir, 'exceptions.log'),
          format: fileFormat 
        })]
      : []
    ),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    consoleTransport,
    ...(config.NODE_ENV === 'production' 
      ? [new winston.transports.File({ 
          filename: path.join(logsDir, 'rejections.log'),
          format: fileFormat 
        })]
      : []
    ),
  ],
  
  // Exit on handled exceptions
  exitOnError: false,
});

/**
 * Create separate logger for HTTP access logs
 */
const accessLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: {
    service: `${config.APP.NAME}-access`,
    environment: config.NODE_ENV,
  },
  transports: [
    ...(config.NODE_ENV === 'production' || process.env.LOG_FILES === 'true'
      ? [accessFileTransport]
      : [consoleTransport]
    ),
  ],
});

/**
 * Create separate logger for database operations
 */
const dbLogger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: fileFormat,
  defaultMeta: {
    service: `${config.APP.NAME}-db`,
    environment: config.NODE_ENV,
  },
  transports: [
    consoleTransport,
    ...(config.NODE_ENV === 'production' || process.env.LOG_FILES === 'true'
      ? [new DailyRotateFile({
          filename: path.join(logsDir, 'database-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          format: fileFormat,
          maxFiles: '30d',
          maxSize: '10m',
          zippedArchive: true,
        })]
      : []
    ),
  ],
});

/**
 * Create separate logger for security events
 */
const securityLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: {
    service: `${config.APP.NAME}-security`,
    environment: config.NODE_ENV,
  },
  transports: [
    consoleTransport,
    ...(config.NODE_ENV === 'production' || process.env.LOG_FILES === 'true'
      ? [new DailyRotateFile({
          filename: path.join(logsDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          format: fileFormat,
          maxFiles: '90d', // Keep security logs for 90 days
          maxSize: '10m',
          zippedArchive: true,
        })]
      : []
    ),
  ],
});

/**
 * Stream interface for Morgan HTTP logger
 */
export const morganStream = {
  write: (message: string) => {
    accessLogger.info(message.trim());
  },
};

/**
 * Log levels for reference
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

/**
 * Utility functions for structured logging
 */
export const logUtils = {
  /**
   * Log authentication events
   */
  logAuth: (event: string, userId?: string, metadata?: any) => {
    securityLogger.info(`AUTH: ${event}`, {
      event: 'authentication',
      action: event,
      userId,
      ...metadata,
    });
  },

  /**
   * Log security events
   */
  logSecurity: (event: string, severity: 'low' | 'medium' | 'high' = 'medium', metadata?: any) => {
    securityLogger.warn(`SECURITY: ${event}`, {
      event: 'security',
      severity,
      ...metadata,
    });
  },

  /**
   * Log database operations
   */
  logDB: (operation: string, collection?: string, metadata?: any) => {
    dbLogger.info(`DB: ${operation}`, {
      event: 'database',
      operation,
      collection,
      ...metadata,
    });
  },

  /**
   * Log API requests
   */
  logRequest: (method: string, url: string, statusCode: number, responseTime?: number, metadata?: any) => {
    accessLogger.info(`${method} ${url} ${statusCode}`, {
      event: 'http_request',
      method,
      url,
      statusCode,
      responseTime,
      ...metadata,
    });
  },

  /**
   * Log business events
   */
  logBusiness: (event: string, entityType?: string, entityId?: string, metadata?: any) => {
    logger.info(`BUSINESS: ${event}`, {
      event: 'business',
      action: event,
      entityType,
      entityId,
      ...metadata,
    });
  },

  /**
   * Log performance metrics
   */
  logPerformance: (operation: string, duration: number, metadata?: any) => {
    logger.info(`PERFORMANCE: ${operation} took ${duration}ms`, {
      event: 'performance',
      operation,
      duration,
      ...metadata,
    });
  },
};

/**
 * Error logging helper
 */
export const logError = (error: Error | unknown, context?: string, metadata?: any) => {
  if (error instanceof Error) {
    logger.error(`${context ? `[${context}] ` : ''}${error.message}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      ...metadata,
    });
  } else {
    logger.error(`${context ? `[${context}] ` : ''}Unknown error occurred`, {
      error: error,
      context,
      ...metadata,
    });
  }
};

/**
 * Create child logger with additional context
 */
export const createChildLogger = (context: string, metadata: any = {}) => {
  return logger.child({
    context,
    ...metadata,
  });
};

/**
 * Conditional logging based on environment
 */
export const devLog = (message: string, metadata?: any) => {
  if (config.NODE_ENV === 'development') {
    logger.debug(`[DEV] ${message}`, metadata);
  }
};

/**
 * Express.js request logger middleware helper
 */
export const getRequestLogger = () => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logUtils.logRequest(
        req.method,
        req.originalUrl,
        res.statusCode,
        duration,
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?._id,
        }
      );
    });
    
    next();
  };
};

// Export loggers
export {
  logger as default,
  accessLogger,
  dbLogger,
  securityLogger,
};

// Log startup information
logger.info('Logger initialized', {
  level: config.LOG_LEVEL,
  environment: config.NODE_ENV,
  service: config.APP.NAME,
});