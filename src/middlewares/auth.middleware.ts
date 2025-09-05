import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '@config/index.js';
import ApiError from '@utils/ApiError.js';
import logger from '@config/logger.js';
import { ITokenPayload } from '@services/auth.service.js';
import { IUser, UserRole } from '@models/user/user.types.js';
import User from '@/models/user/user.model.js';

/**
 * Extend Express Request interface to include authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: IUser  ;
      userId?: string;
    }
  }
}

/**
 * Extract JWT token from request headers
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in cookies (for web applications)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

/**
 * Authenticate JWT token middleware
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw ApiError.unauthorized('Access token is required');
    }

    // Verify token
    let decoded: ITokenPayload;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as ITokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid access token');
      }
      throw ApiError.unauthorized('Token verification failed');
    }

    // Check token type (should not be refresh token)
    if (decoded.type === 'refresh') {
      throw ApiError.unauthorized('Invalid token type');
    }

    // Find user and populate currentLocation
    const user = await User.findById(decoded.id)
      .populate('currentLocationId');

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Check if user account is active
    if (user.status !== 'active') {
      throw ApiError.forbidden('Account is inactive or suspended');
    }

    // Check if token was issued before password change
    if (user.auth.passwordChangedAt && decoded.iat) {
      const passwordChangedTimestamp = Math.floor(user.auth.passwordChangedAt.getTime() / 1000);
      
      if (decoded.iat < passwordChangedTimestamp) {
        throw ApiError.unauthorized('Token is invalid due to recent password change');
      }
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id!.toString();

    logger.debug('User authenticated successfully', { 
      userId: user._id!.toString(), 
      email: user.email,
      role: user.role 
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error instanceof ApiError) {
      return next(error);
    }

    next(ApiError.unauthorized('Authentication failed'));
  }
};

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(); // Continue without user
    }

    // Use the same logic as authenticate but don't throw errors
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as ITokenPayload;
      
      if (decoded.type === 'refresh') {
        return next(); // Skip invalid token type
      }

      const user = await User.findById(decoded.id);

      if (user && user.status === 'active') {
        // Check password change timestamp
        if (user.auth.passwordChangedAt && decoded.iat) {
          const passwordChangedTimestamp = Math.floor(user.auth.passwordChangedAt.getTime() / 1000);
          
          if (decoded.iat >= passwordChangedTimestamp) {
            req.user = user;
            req.userId = user._id!.toString();
          }
        } else {
          req.user = user;
          req.userId = user._id!.toString();
        }
      }
    } catch (error) {
      // Silently ignore token errors for optional authentication
      logger.debug('Optional authentication failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    next();
  } catch (error) {
    // Even if there's an unexpected error, continue without authentication
    logger.warn('Optional authentication error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next();
  }
};

/**
 * Role-based authorization middleware factory
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed', { 
        userId: req.user._id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });

      return next(ApiError.forbidden('Insufficient permissions'));
    }

    logger.debug('User authorized successfully', { 
      userId: req.user._id, 
      userRole: req.user.role, 
      requiredRoles: roles 
    });

    next();
  };
};

/**
 * Admin-only middleware
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Seller or Admin middleware
 */
export const sellerOrAdmin = authorize(UserRole.SELLER, UserRole.ADMIN);

/**
 * Driver or Admin middleware
 */
export const driverOrAdmin = authorize(UserRole.DRIVER, UserRole.ADMIN);

/**
 * Check if user owns resource middleware factory
 */
export const checkResourceOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];

    // Admin can access any resource
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // User can only access their own resources
    if (req.user._id!.toString() !== resourceUserId) {
      logger.warn('Resource ownership check failed', { 
        userId: req.user._id!.toString(), 
        resourceUserId,
        userRole: req.user.role 
      });

      return next(ApiError.forbidden('Access denied to this resource'));
    }

    next();
  };
};

/**
 * Check if user is verified middleware
 */
export const requireEmailVerification = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!req.user.auth.emailVerifiedAt) {
    logger.warn('Email verification required', { userId: req.user._id });
    return next(ApiError.forbidden('Email verification required'));
  }

  next();
};

/**
 * Rate limiting by user ID middleware
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const userId = req.user._id!.toString();
    const now = Date.now();
    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset window
      requests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      const remainingTime = Math.ceil((userRequests.resetTime - now) / 1000);
      
      logger.warn('User rate limit exceeded', { 
        userId, 
        requests: userRequests.count, 
        maxRequests,
        remainingTime 
      });

      return next(ApiError.tooManyRequests(
        `Too many requests. Try again in ${remainingTime} seconds`
      ));
    }

    userRequests.count++;
    next();
  };
};

/**
 * API key authentication middleware (for API access)
 */
export const apiKeyAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw ApiError.unauthorized('API key is required');
    }

    // In a real application, you would validate this against a database
    // For now, we'll just check if it matches a configured API key
    const validApiKeys = process.env['API_KEYS']?.split(',') || [];

    if (!validApiKeys.includes(apiKey)) {
      throw ApiError.unauthorized('Invalid API key');
    }

    logger.debug('API key authenticated successfully', { apiKey: apiKey.substring(0, 8) + '...' });

    // For API key auth, we might want to set a system user or skip user requirement
    next();
  } catch (error) {
    logger.warn('API key authentication failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next(error);
  }
};

/**
 * Middleware to check if user account is not locked
 */
export const checkAccountLock = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (req.user.isAccountLocked()) {
    const lockUntil = req.user.auth.lockUntil!;
    const remainingTime = Math.ceil((lockUntil.getTime() - Date.now()) / (1000 * 60));
    
    logger.warn('Blocked request from locked account', { userId: req.user._id });

    return next(ApiError.forbidden(`Account is locked. Try again in ${remainingTime} minutes`));
  }

  next();
};

/**
 * Middleware to log authenticated requests
 */
export const logAuthenticatedRequest = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user) {
    logger.info('Authenticated request', {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  next();
};

/**
 * Middleware to add security headers
 */
export const addSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Add security-related headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add CSRF token header if user is authenticated
  if (req.user) {
    const csrfToken = jwt.sign(
      { userId: req.user._id!.toString(), type: 'csrf' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.setHeader('X-CSRF-Token', csrfToken);
  }

  next();
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  adminOnly,
  sellerOrAdmin,
  driverOrAdmin,
  checkResourceOwnership,
  requireEmailVerification,
  userRateLimit,
  apiKeyAuth,
  checkAccountLock,
  logAuthenticatedRequest,
  addSecurityHeaders,
};