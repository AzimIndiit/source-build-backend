import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import ApiError from '@utils/ApiError.js';

/**
 * Middleware factory for validating request data using Zod schemas
 * @param schema - Zod schema to validate against
 * @param source - Source of data to validate ('body', 'query', 'params')
 * @returns Express middleware function
 */
export const validate = (
  schema: z.ZodSchema<any>,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the data
      const validated = await schema.parseAsync(req[source]);
      
      // Replace the original data with validated/transformed data
      // For query and params, we need to handle them differently since they're getter properties
      if (source === 'query') {
        // Store validated query data in a new property or directly use it
        (req as any).validatedQuery = validated;
        // Also update req.query by creating a new object
        Object.keys(validated).forEach(key => {
          (req.query as any)[key] = validated[key];
        });
      } else if (source === 'params') {
        (req as any).validatedParams = validated;
        Object.keys(validated).forEach(key => {
          req.params[key] = validated[key];
        });
      } else {
        req[source] = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a more readable format
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return next(ApiError.validationError('Validation failed', formattedErrors));
      }
      
      // For non-Zod errors, pass them along
      return next(error);
    }
  };
};

/**
 * Middleware for validating multiple sources at once
 */
export const validateRequest = (schemas: {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate each source if schema is provided
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return next(ApiError.validationError('Validation failed', formattedErrors));
      }
      
      return next(error);
    }
  };
};