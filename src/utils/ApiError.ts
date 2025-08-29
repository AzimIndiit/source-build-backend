/**
 * Custom API Error class that extends the native Error class
 * Provides structured error handling with HTTP status codes and additional metadata
 */
class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public stack?: string;
  public errors?: any[];
  public code?: string | number;

  /**
   * Create an API Error
   * @param message - Error message
   * @param codeOrStatusCode - Error code (string) or HTTP status code (number)
   * @param statusCodeOrOperational - HTTP status code (number) or operational flag (boolean)
   * @param stackOrOperational - Stack trace (string) or operational flag (boolean)
   * @param errors - Additional error details (for validation errors)
   * @param code - Error code (for specific error identification)
   */
  constructor(
    message: string,
    codeOrStatusCode?: string | number,
    statusCodeOrOperational?: number | boolean,
    stackOrOperational?: string | boolean,
    errors?: any[],
    code?: string | number
  ) {
    super(message);
    
    this.name = this.constructor.name;
    
    // Handle flexible constructor parameters
    if (typeof codeOrStatusCode === 'string') {
      // New signature: (message, code, statusCode)
      this.code = codeOrStatusCode;
      this.statusCode = typeof statusCodeOrOperational === 'number' ? statusCodeOrOperational : 500;
      this.isOperational = typeof stackOrOperational === 'boolean' ? stackOrOperational : true;
      if (errors !== undefined) {
        this.errors = errors;
      }
    } else if (typeof codeOrStatusCode === 'number') {
      // Original signature: (message, statusCode, isOperational, stack, errors, code)
      this.statusCode = codeOrStatusCode;
      this.isOperational = typeof statusCodeOrOperational === 'boolean' ? statusCodeOrOperational : true;
      if (typeof stackOrOperational === 'string') {
        this.stack = stackOrOperational;
      }
      if (errors !== undefined) {
        this.errors = errors;
      }
      if (code !== undefined) {
        this.code = code;
      }
    } else {
      // Default values
      this.statusCode = 500;
      this.isOperational = true;
    }

    if (!this.stack) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a Bad Request error (400)
   */
  static badRequest(message: string = 'Bad Request', errors?: any[], code?: string): ApiError {
    return new ApiError(message, 400, true, undefined, errors, code);
  }

  /**
   * Create an Unauthorized error (401)
   */
  static unauthorized(message: string = 'Unauthorized', code?: string): ApiError {
    return new ApiError(message, 401, true, undefined, undefined, code);
  }

  /**
   * Create a Forbidden error (403)
   */
  static forbidden(message: string = 'Forbidden', code?: string): ApiError {
    return new ApiError(message, 403, true, undefined, undefined, code);
  }

  /**
   * Create a Not Found error (404)
   */
  static notFound(message: string = 'Resource not found', code?: string): ApiError {
    return new ApiError(message, 404, true, undefined, undefined, code);
  }

  /**
   * Create a Method Not Allowed error (405)
   */
  static methodNotAllowed(message: string = 'Method not allowed', code?: string): ApiError {
    return new ApiError(message, 405, true, undefined, undefined, code);
  }

  /**
   * Create a Conflict error (409)
   */
  static conflict(message: string = 'Resource conflict', code?: string): ApiError {
    return new ApiError(message, 409, true, undefined, undefined, code);
  }

  /**
   * Create a Validation error (422)
   */
  static validationError(message: string = 'Validation failed', errors?: any[], code?: string): ApiError {
    return new ApiError(message, 422, true, undefined, errors, code);
  }

  /**
   * Create a Too Many Requests error (429)
   */
  static tooManyRequests(message: string = 'Too many requests', code?: string): ApiError {
    return new ApiError(message, 429, true, undefined, undefined, code);
  }

  /**
   * Create an Internal Server error (500)
   */
  static internal(message: string = 'Internal server error', code?: string): ApiError {
    return new ApiError(message, 500, true, undefined, undefined, code);
  }

  /**
   * Create a Not Implemented error (501)
   */
  static notImplemented(message: string = 'Not implemented', code?: string): ApiError {
    return new ApiError(message, 501, true, undefined, undefined, code);
  }

  /**
   * Create a Service Unavailable error (503)
   */
  static serviceUnavailable(message: string = 'Service unavailable', code?: string): ApiError {
    return new ApiError(message, 503, true, undefined, undefined, code);
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      errors: this.errors,
      code: this.code,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }

  /**
   * Check if error is an ApiError instance
   */
  static isApiError(error: any): error is ApiError {
    return error instanceof ApiError;
  }

  /**
   * Check if error is operational
   */
  static isOperationalError(error: any): boolean {
    if (ApiError.isApiError(error)) {
      return error.isOperational;
    }
    return false;
  }
}

export default ApiError;