/**
 * Express type extensions and augmentations
 * This file extends Express types to include custom properties and methods
 */

import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    /**
     * Extended Request interface with custom properties
     */
    interface Request {
      // User authentication
      user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
        isEmailVerified?: boolean;
        profile?: {
          firstName?: string;
          lastName?: string;
          avatar?: string;
          phone?: string;
        };
        preferences?: {
          language?: string;
          timezone?: string;
          theme?: 'light' | 'dark';
        };
        lastLoginAt?: Date;
        createdAt?: Date;
        updatedAt?: Date;
      };

      // JWT payload
      jwtPayload?: JwtPayload;

      // Request context
      requestId?: string;
      startTime?: number;
      ip?: string;
      userAgent?: string;

      // File uploads
      files?: {
        [fieldname: string]: Express.Multer.File[] | Express.Multer.File;
      };

      // Validation results
      validatedData?: {
        body?: any;
        params?: any;
        query?: any;
        headers?: any;
      };

      // Rate limiting
      rateLimit?: {
        limit: number;
        remaining: number;
        reset: Date;
        total: number;
      };

      // Pagination
      pagination?: {
        page: number;
        limit: number;
        offset: number;
        sort?: string;
        order?: 'asc' | 'desc';
      };

      // Search and filtering
      filters?: {
        [key: string]: any;
      };

      // Organization context (for multi-tenant apps)
      organization?: {
        id: string;
        name: string;
        slug: string;
        plan?: string;
        settings?: any;
      };

      // API version
      apiVersion?: string;

      // Feature flags
      features?: {
        [featureName: string]: boolean;
      };

      // Analytics and tracking
      analytics?: {
        sessionId?: string;
        userId?: string;
        eventData?: any;
      };
    }

    /**
     * Extended Response interface with custom methods
     */
    interface Response {
      // Custom response methods (if added via middleware)
      success?: <T = any>(data: T, message?: string, statusCode?: number) => Response;
      error?: (message: string, statusCode?: number, errors?: any[]) => Response;
      fail?: (message: string, statusCode?: number, errors?: any[]) => Response;
      paginated?: <T = any>(
        data: T,
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        },
        message?: string
      ) => Response;
    }
  }
}

/**
 * Custom middleware function type with extended Request/Response
 */
export type CustomMiddleware = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) => void | Promise<void>;

/**
 * Async middleware function type
 */
export type AsyncMiddleware = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) => Promise<void>;

/**
 * Controller function type
 */
export type Controller = (
  req: Express.Request,
  res: Express.Response,
  next?: Express.NextFunction
) => void | Promise<void>;

/**
 * Async controller function type
 */
export type AsyncController = (
  req: Express.Request,
  res: Express.Response,
  next?: Express.NextFunction
) => Promise<void>;

/**
 * Route handler with custom request/response types
 */
export interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  middlewares?: CustomMiddleware[];
  handler: Controller | AsyncController;
  validation?: {
    body?: any;
    params?: any;
    query?: any;
    headers?: any;
  };
  permissions?: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

/**
 * User roles enumeration
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * User permissions enumeration
 */
export enum UserPermission {
  // User management
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  
  // Product management
  CREATE_PRODUCT = 'create:product',
  READ_PRODUCT = 'read:product',
  UPDATE_PRODUCT = 'update:product',
  DELETE_PRODUCT = 'delete:product',
  
  // Order management
  CREATE_ORDER = 'create:order',
  READ_ORDER = 'read:order',
  UPDATE_ORDER = 'update:order',
  DELETE_ORDER = 'delete:order',
  
  // System administration
  MANAGE_SYSTEM = 'manage:system',
  VIEW_ANALYTICS = 'view:analytics',
  MANAGE_SETTINGS = 'manage:settings',
}

/**
 * API response status types
 */
export type ApiResponseStatus = 'success' | 'error' | 'fail';

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Sort parameters interface
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter parameters interface
 */
export interface FilterParams {
  [key: string]: any;
}

/**
 * Search parameters interface
 */
export interface SearchParams {
  query?: string;
  fields?: string[];
  exact?: boolean;
  caseSensitive?: boolean;
}

// Export empty object to make this file a module
export {};