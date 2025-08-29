import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Higher-order function that wraps async route handlers
 * to automatically catch errors and pass them to the error handler
 * 
 * This eliminates the need to write try-catch blocks in every async controller
 * 
 * @param fn - Async function to wrap
 * @returns Express RequestHandler
 * 
 * @example
 * ```typescript
 * // Without catchAsync (manual error handling)
 * const getUsers = async (req: Request, res: Response, next: NextFunction) => {
 *   try {
 *     const users = await userService.getAllUsers();
 *     res.json(users);
 *   } catch (error) {
 *     next(error);
 *   }
 * };
 * 
 * // With catchAsync (automatic error handling)
 * const getUsers = catchAsync(async (req: Request, res: Response) => {
 *   const users = await userService.getAllUsers();
 *   res.json(users);
 * });
 * ```
 */
const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;

/**
 * Alternative export for different import styles
 */
export { catchAsync };

/**
 * Typed version for better TypeScript support with specific request/response types
 */
export const catchAsyncTyped = <
  TRequest extends Request = Request,
  TResponse extends Response = Response
>(
  fn: (req: TRequest, res: TResponse, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TRequest, res as TResponse, next)).catch(next);
  };
};

/**
 * Utility function to wrap multiple async middlewares
 * Useful when you want to apply catchAsync to an array of middlewares
 */
export const catchAsyncMiddlewares = (
  middlewares: Array<(req: Request, res: Response, next: NextFunction) => Promise<any>>
): RequestHandler[] => {
  return middlewares.map(middleware => catchAsync(middleware));
};

/**
 * Higher-order function for async validation middleware
 * Specifically designed for validation functions that might throw errors
 */
export const catchAsyncValidation = (
  validationFn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return catchAsync(validationFn);
};

/**
 * Utility to handle async operations within synchronous functions
 * Useful for background tasks that shouldn't block the response
 */
export const handleAsync = <T>(
  promise: Promise<T>,
  errorHandler?: (error: any) => void
): void => {
  promise.catch(error => {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Unhandled async error:', error);
    }
  });
};