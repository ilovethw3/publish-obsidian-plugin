import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    statusCode: err.statusCode || 500
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'Resource conflict';
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message: message,
      timestamp: new Date().toISOString()
    }
  });
};

// Helper function to create custom errors
export const createError = (message: string, statusCode: number = 500): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  return error;
};