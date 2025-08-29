import { Response } from 'express';

/**
 * Interface for standardized API response structure
 */
export interface IApiResponse<T = any> {
  status: 'success' | 'error' | 'fail';
  message: string;
  data?: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  errors?: any[];
}

/**
 * Interface for pagination metadata
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standardized API Response class
 * Provides consistent response format across all API endpoints
 */
class ApiResponse {
  /**
   * Send a success response
   */
  static success<T = any>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: Partial<IApiResponse['meta']>
  ): Response {
    const response: IApiResponse<T> = {
      status: 'success',
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        ...meta,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send a success response with pagination
   */
  static successWithPagination<T = any>(
    res: Response,
    data: T,
    pagination: IPaginationMeta,
    message: string = 'Data retrieved successfully',
    statusCode: number = 200
  ): Response {
    const response: IApiResponse<T> = {
      status: 'success',
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        pagination,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    errors?: any[],
    data?: any
  ): Response {
    const response: IApiResponse = {
      status: 'error',
      message,
      ...(data && { data }),
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
      ...(errors && { errors }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send a fail response (client error)
   */
  static fail(
    res: Response,
    message: string = 'Request failed',
    statusCode: number = 400,
    errors?: any[],
    data?: any
  ): Response {
    const response: IApiResponse = {
      status: 'fail',
      message,
      ...(data && { data }),
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
      ...(errors && { errors }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send a created response (201)
   */
  static created<T = any>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send a no content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).end();
  }

  /**
   * Send a bad request response (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request',
    errors?: any[]
  ): Response {
    return ApiResponse.fail(res, message, 400, errors);
  }

  /**
   * Send an unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return ApiResponse.error(res, message, 401);
  }

  /**
   * Send a forbidden response (403)
   */
  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response {
    return ApiResponse.error(res, message, 403);
  }

  /**
   * Send a not found response (404)
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return ApiResponse.fail(res, message, 404);
  }

  /**
   * Send a validation error response (422)
   */
  static validationError(
    res: Response,
    errors: any[],
    message: string = 'Validation failed'
  ): Response {
    return ApiResponse.fail(res, message, 422, errors);
  }

  /**
   * Send an internal server error response (500)
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return ApiResponse.error(res, message, 500);
  }

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    page: number,
    limit: number,
    total: number
  ): IPaginationMeta {
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      pages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Parse pagination parameters from query
   */
  static parsePagination(query: any): { page: number; limit: number } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    
    return { page, limit };
  }

  /**
   * Generate pagination links (optional utility)
   */
  static generatePaginationLinks(
    baseUrl: string,
    page: number,
    limit: number,
    total: number
  ): Record<string, string | null> {
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      first: `${baseUrl}?page=1&limit=${limit}`,
      prev: hasPrev ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null,
      next: hasNext ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null,
      last: `${baseUrl}?page=${pages}&limit=${limit}`,
    };
  }
}

export default ApiResponse;