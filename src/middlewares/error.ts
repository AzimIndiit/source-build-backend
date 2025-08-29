import { Request, Response, NextFunction } from 'express';
import { MongooseError } from 'mongoose';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';

import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { httpStatus } from '../utils/constants.js';
import config from '../config/index.js';

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (error: any): ApiError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new ApiError(message, httpStatus.BAD_REQUEST);
};

/**
 * Handle Mongoose ValidationError
 */
const handleValidationError = (error: any): ApiError => {
  const errors = Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: err.message,
    value: err.value,
  }));
  
  const message = 'Validation failed';
  return new ApiError(message, httpStatus.UNPROCESSABLE_ENTITY, true, undefined, errors);
};

/**
 * Handle Mongoose duplicate key error
 */
const handleDuplicateKeyError = (error: any): ApiError => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `Duplicate value for field '${field}': '${value}'. Please use another value.`;
  
  return new ApiError(message, httpStatus.CONFLICT, true, undefined, [
    {
      field,
      message: `Value '${value}' already exists`,
      value,
    },
  ]);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (): ApiError => {
  return new ApiError('Invalid token. Please log in again.', httpStatus.UNAUTHORIZED);
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = (): ApiError => {
  return new ApiError('Token expired. Please log in again.', httpStatus.UNAUTHORIZED);
};

/**
 * Handle Zod validation errors
 */
const handleZodError = (error: ZodError): ApiError => {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
  
  const message = 'Validation failed';
  return new ApiError(message, httpStatus.UNPROCESSABLE_ENTITY, true, undefined, errors);
};

/**
 * Convert known errors to ApiError instances
 */
const convertToApiError = (error: any): ApiError => {
  let apiError: ApiError;

  if (error.name === 'CastError') {
    apiError = handleCastError(error);
  } else if (error.name === 'ValidationError') {
    apiError = handleValidationError(error);
  } else if (error.code === 11000) {
    apiError = handleDuplicateKeyError(error);
  } else if (error.name === 'JsonWebTokenError') {
    apiError = handleJWTError();
  } else if (error.name === 'TokenExpiredError') {
    apiError = handleJWTExpiredError();
  } else if (error instanceof ZodError) {
    apiError = handleZodError(error);
  } else if (error instanceof ApiError) {
    apiError = error;
  } else {
    // Unknown error - convert to generic ApiError
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Something went wrong';
    const isOperational = error.isOperational || false;
    
    apiError = new ApiError(
      message,
      statusCode,
      isOperational,
      error.stack
    );
  }

  return apiError;
};

/**
 * Log error details (for development and monitoring)
 */
const logError = (error: ApiError, req: Request): void => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id || 'Anonymous',
    error: {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      stack: error.stack,
    },
    body: req.body,
    params: req.params,
    query: req.query,
  };

  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(errorInfo, null, 2));
  } else if (config.NODE_ENV === 'development') {
    console.warn('⚠️  Client Error:', JSON.stringify(errorInfo, null, 2));
  }
};

/**
 * Send error response to client
 */
const sendErrorResponse = (error: ApiError, res: Response): void => {
  const isDevelopment = config.NODE_ENV === 'development';
  
  // Prepare error response
  const errorResponse = {
    status: error.statusCode < 500 ? 'fail' : 'error',
    message: error.message,
    ...(error.errors && { errors: error.errors }),
    ...(error.code && { code: error.code }),
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
    // Include stack trace only in development
    ...(isDevelopment && { stack: error.stack }),
  };

  res.status(error.statusCode).json(errorResponse);
};

/**
 * Global error handling middleware
 * This should be the last middleware in the application
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Convert to ApiError if not already
  const apiError = convertToApiError(error);
  
  // Log error details
  logError(apiError, req);
  
  // Send error response
  sendErrorResponse(apiError, res);
};

/**
 * Handle 404 errors (route not found)
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Route ${req.originalUrl} not found`;
  const error = new ApiError(message, httpStatus.NOT_FOUND);
  next(error);
};

/**
 * Handle async errors in middleware
 * Wrapper for async middleware to catch promise rejections
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🚨 Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    
    // Gracefully close the server
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    
    // Gracefully close the server
    process.exit(1);
  });
};

/**
 * Initialize error handlers
 */
export const initializeErrorHandlers = (): void => {
  handleUnhandledRejection();
  handleUncaughtException();
};

export default {
  errorHandler,
  notFound,
  asyncErrorHandler,
  initializeErrorHandlers,
};