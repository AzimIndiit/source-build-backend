import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger, { morganStream, logUtils } from '@config/logger.js';
import config from '@config/index.js';

/**
 * Custom Morgan token definitions
 */

// Register custom tokens
morgan.token('id', (req: any) => req.id || 'unknown');
morgan.token('user-id', (req: any) => req.user?._id?.toString() || 'anonymous');
morgan.token('user-role', (req: any) => req.user?.role || 'none');
morgan.token('real-ip', (req: any) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.ip;
});

/**
 * Custom format for different environments
 */
const developmentFormat = ':method :url :status :response-time ms - :res[content-length] bytes [:user-id]';

const productionFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':real-ip',
  userId: ':user-id',
  userRole: ':user-role',
  referer: ':referrer',
});

/**
 * Skip logging for certain routes (health checks, etc.)
 */
const skipRoutes = [
  '/health',
  '/api/v1/auth/health',
  '/favicon.ico',
];

const shouldSkipLogging = (req: Request): boolean => {
  // Skip health check endpoints
  if (skipRoutes.some(route => req.url.includes(route))) {
    return true;
  }

  // Skip static assets in production
  if (config.NODE_ENV === 'production' && req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return true;
  }

  return false;
};

/**
 * Basic HTTP request logger using Morgan
 */
export const httpLogger = morgan(
  config.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    stream: morganStream,
    skip: (req: Request) => shouldSkipLogging(req),
  }
);

/**
 * Detailed request logger middleware
 */
export const detailedRequestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Skip if already handled by basic logger
  if (shouldSkipLogging(req)) {
    return next();
  }

  const startTime = Date.now();
  
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  const requestId = req.headers['x-request-id'] as string;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    userId: (req as any).user?._id,
    userRole: (req as any).user?.role,
    body: config.NODE_ENV === 'development' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: JSON.stringify(body).length,
      userId: (req as any).user?._id,
      body: config.NODE_ENV === 'development' ? body : undefined,
    });

    // Call original json method
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Error request logger middleware
 */
export const errorRequestLogger = (error: any, req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string;

  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?._id,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
    },
    body: config.NODE_ENV === 'development' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  next(error);
};

/**
 * Security-focused request logger
 */
export const securityRequestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    // SQL injection attempts
    /(\b(union|select|insert|delete|drop|create|alter|exec|execute)\b)/i,
    // XSS attempts
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Command injection
    /[;&|`$()]/,
    // Path traversal
    /\.\.\//,
  ];

  const requestData = JSON.stringify({
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Check for suspicious patterns
  const foundSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(requestData));

  if (foundSuspiciousPattern) {
    logUtils.logSecurity('Suspicious request pattern detected', 'high', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?._id,
      body: req.body,
      query: req.query,
      params: req.params,
    });
  }

  // Log authentication-related requests
  if (req.originalUrl.includes('/auth/')) {
    logUtils.logAuth(`${req.method} ${req.originalUrl}`, (req as any).user?._id, {
      requestId: req.headers['x-request-id'],
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logUtils.logPerformance(`Slow request: ${req.method} ${req.originalUrl}`, duration, {
        requestId: req.headers['x-request-id'],
        statusCode: res.statusCode,
        userId: (req as any).user?._id,
      });
    }

    // Log all requests in development
    if (config.NODE_ENV === 'development') {
      logUtils.logPerformance(`${req.method} ${req.originalUrl}`, duration, {
        requestId: req.headers['x-request-id'],
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

/**
 * Request size monitoring middleware
 */
export const requestSizeLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestSize = parseInt(req.get('content-length') || '0');
  
  // Log large requests (> 1MB)
  if (requestSize > 1024 * 1024) {
    logger.warn('Large request detected', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.originalUrl,
      size: `${Math.round(requestSize / 1024 / 1024)}MB`,
      ip: req.ip,
      userId: (req as any).user?._id,
    });
  }

  next();
};

/**
 * User activity logger
 */
export const userActivityLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Only log for authenticated users
  if (!(req as any).user) {
    return next();
  }

  const user = (req as any).user;
  
  // Skip logging for certain routes
  if (shouldSkipLogging(req)) {
    return next();
  }

  // Log user activity
  logUtils.logBusiness('User activity', 'user', user._id, {
    requestId: req.headers['x-request-id'],
    action: `${req.method} ${req.originalUrl}`,
    userId: user._id,
    userRole: user.role,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  next();
};

/**
 * Combined logging middleware that includes multiple loggers
 */
export const combinedLogger = [
  securityRequestLogger,
  detailedRequestLogger,
  performanceLogger,
  requestSizeLogger,
  userActivityLogger,
  errorRequestLogger,
];

/**
 * Simple HTTP logger for production
 */
export const productionLogger = [
  httpLogger,
  securityRequestLogger,
  errorRequestLogger,
];

/**
 * Development logger with detailed information
 */
export const developmentLogger = combinedLogger;

/**
 * Get appropriate logger based on environment
 */
export const getLogger = () => {
  return config.NODE_ENV === 'production' ? productionLogger : developmentLogger;
};

export default {
  httpLogger,
  detailedRequestLogger,
  errorRequestLogger,
  securityRequestLogger,
  performanceLogger,
  requestSizeLogger,
  userActivityLogger,
  combinedLogger,
  productionLogger,
  developmentLogger,
  getLogger,
};