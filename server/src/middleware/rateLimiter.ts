import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from './logger';
import { createTokenHash } from './auth';

// Rate limiting configurations
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const PUBLIC_LIMIT = 50; // Requests per window for public endpoints
const API_LIMIT = 200; // Requests per window for authenticated endpoints

/**
 * Rate limiter for public endpoints (GET requests)
 * Applies stricter limits for unauthenticated requests
 */
export const publicRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: PUBLIC_LIMIT,
  message: {
    error: {
      message: 'Too many requests from this IP address. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded for public endpoint', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      limit: PUBLIC_LIMIT,
      windowMs: WINDOW_MS
    });

    res.status(429).json({
      error: {
        message: 'Too many requests from this IP address. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(WINDOW_MS / 1000) // seconds
      }
    });
  }
});

/**
 * Rate limiter for authenticated API endpoints
 * Uses token-based keys for more generous limits
 */
export const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: API_LIMIT,
  message: {
    error: {
      message: 'Too many API requests. Please try again later.',
      code: 'API_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Generate key based on token hash + IP for better tracking
  keyGenerator: (req: Request): string => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (tokenMatch) {
        const token = tokenMatch[1];
        const tokenHash = createTokenHash(token);
        // Use token hash as primary key for authenticated requests
        return `api_token_${tokenHash}`;
      }
    }
    
    // Fallback to IP-based limiting if no valid token
    // Use the default behavior for IP handling
    return `api_ip_${req.ip}`;
  },

  // Skip rate limiting for requests without authorization header
  // (they should be handled by requireApiToken middleware first)
  skip: (req: Request): boolean => {
    return !req.headers.authorization;
  },

  handler: (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const tokenHash = authHeader ? 
      createTokenHash(authHeader.replace('Bearer ', '')) : 
      'none';

    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      tokenHash,
      limit: API_LIMIT,
      windowMs: WINDOW_MS
    });

    res.status(429).json({
      error: {
        message: 'Too many API requests. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(WINDOW_MS / 1000) // seconds
      }
    });
  }
});

/**
 * Aggressive rate limiter for authentication failures
 * Applies very strict limits to prevent brute force attacks
 */
export const authFailureRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Only 5 failed attempts per hour per IP
  message: {
    error: {
      message: 'Too many authentication failures. Please try again later.',
      code: 'AUTH_FAILURE_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Only count failed auth attempts, not successful ones
  skipSuccessfulRequests: true,
  
  handler: (req: Request, res: Response) => {
    logger.error('Authentication failure rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      limit: 5,
      windowMs: 60 * 60 * 1000
    });

    res.status(429).json({
      error: {
        message: 'Too many authentication failures from this IP address. Access temporarily blocked.',
        code: 'AUTH_FAILURE_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600 // seconds (1 hour)
      }
    });
  }
});

/**
 * Create custom rate limiter with specific options
 */
export function createCustomRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  code: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: {
        message: options.message,
        code: options.code
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        limit: options.max,
        windowMs: options.windowMs,
        code: options.code
      });

      res.status(429).json({
        error: {
          message: options.message,
          code: options.code,
          retryAfter: Math.ceil(options.windowMs / 1000)
        }
      });
    }
  });
}

/**
 * Rate limiting middleware factory for specific endpoints
 */
export const createEndpointRateLimiter = (endpoint: string, limit: number) => {
  return createCustomRateLimiter({
    windowMs: WINDOW_MS,
    max: limit,
    message: `Too many requests to ${endpoint}. Please try again later.`,
    code: `${endpoint.toUpperCase()}_RATE_LIMIT_EXCEEDED`
  });
};