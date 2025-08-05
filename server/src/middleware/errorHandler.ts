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
  // Enhanced logging with request context
  const authInfo = req.auth ? {
    tokenValid: req.auth.tokenValid,
    tokenHash: req.auth.tokenHash
  } : { tokenValid: false };

  logger.error('Request error', {
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: err.statusCode || 500,
    errorCode: err.code,
    auth: authInfo,
    timestamp: new Date().toISOString()
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'Resource conflict';
    errorCode = 'RESOURCE_CONFLICT';
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'Resource not found';
    errorCode = 'RESOURCE_NOT_FOUND';
  } else if (err.code === 'MISSING_API_TOKEN_CONFIG') {
    statusCode = 500;
    message = 'Server configuration error';
    errorCode = 'MISSING_API_TOKEN_CONFIG';
  } else if (err.code === 'INVALID_API_TOKEN') {
    statusCode = 401;
    message = 'Invalid API token';
    errorCode = 'INVALID_API_TOKEN';
  } else if (err.code === 'MISSING_AUTHORIZATION') {
    statusCode = 401;
    message = 'Authorization header is required';
    errorCode = 'MISSING_AUTHORIZATION';
  } else if (err.code === 'INVALID_AUTHORIZATION_FORMAT') {
    statusCode = 401;
    message = 'Invalid Authorization header format';
    errorCode = 'INVALID_AUTHORIZATION_FORMAT';
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
    errorCode = 'INTERNAL_ERROR';
  }

  // Standard error response format
  res.status(statusCode).json({
    error: {
      message: message,
      code: errorCode,
      timestamp: new Date().toISOString()
    }
  });
};

// Helper function to create custom errors
export const createError = (message: string, statusCode: number = 500, code?: string): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

// Authentication specific error helpers
export const createAuthError = (code: string, message: string): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = 401;
  error.code = code;
  return error;
};

export const createValidationError = (message: string): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
};

export const createNotFoundError = (message: string = 'Resource not found'): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = 404;
  error.code = 'RESOURCE_NOT_FOUND';
  return error;
};

export const createRateLimitError = (message: string, retryAfter?: number): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = 429;
  error.code = 'RATE_LIMIT_EXCEEDED';
  if (retryAfter) {
    (error as any).retryAfter = retryAfter;
  }
  return error;
};