import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import crypto from 'crypto';

// Extend Express Request interface to include auth info
declare global {
  namespace Express {
    interface Request {
      auth?: {
        tokenValid: boolean;
        tokenHash?: string;
      };
    }
  }
}

/**
 * API Token Authentication Middleware
 * 
 * Validates the Authorization header against the configured API_TOKEN environment variable.
 * Implements security best practices including timing attack prevention and secure logging.
 */
export function requireApiToken(req: Request, res: Response, next: NextFunction) {
  const apiToken = process.env.API_TOKEN;
  
  // Check if API_TOKEN is configured
  if (!apiToken) {
    logger.error('API_TOKEN environment variable not configured');
    return res.status(500).json({
      error: {
        message: 'Server configuration error',
        code: 'MISSING_API_TOKEN_CONFIG'
      }
    });
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.warn('API request without Authorization header', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    return res.status(401).json({
      error: {
        message: 'Authorization header is required',
        code: 'MISSING_AUTHORIZATION'
      }
    });
  }

  // Parse Bearer token
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
  if (!tokenMatch) {
    logger.warn('Invalid Authorization header format', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    return res.status(401).json({
      error: {
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
        code: 'INVALID_AUTHORIZATION_FORMAT'
      }
    });
  }

  const providedToken = tokenMatch[1];

  // Constant-time comparison to prevent timing attacks
  const providedTokenBuffer = Buffer.from(providedToken, 'utf8');
  const expectedTokenBuffer = Buffer.from(apiToken, 'utf8');
  
  let isValid = providedTokenBuffer.length === expectedTokenBuffer.length;
  
  // Compare all bytes even if lengths differ to prevent timing attacks
  const maxLength = Math.max(providedTokenBuffer.length, expectedTokenBuffer.length);
  for (let i = 0; i < maxLength; i++) {
    const a = i < providedTokenBuffer.length ? providedTokenBuffer[i] : 0;
    const b = i < expectedTokenBuffer.length ? expectedTokenBuffer[i] : 0;
    isValid = isValid && (a === b);
  }

  if (!isValid) {
    // Create hash for logging (never log actual tokens)
    const tokenHash = crypto.createHash('sha256')
      .update(providedToken)
      .digest('hex')
      .substring(0, 8);

    logger.warn('Invalid API token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      tokenHash,
      authResult: 'failed'
    });
    
    return res.status(401).json({
      error: {
        message: 'Invalid API token',
        code: 'INVALID_API_TOKEN'
      }
    });
  }

  // Success - add auth info to request
  const validTokenHash = crypto.createHash('sha256')
    .update(providedToken)
    .digest('hex')
    .substring(0, 8);

  req.auth = {
    tokenValid: true,
    tokenHash: validTokenHash
  };

  logger.info('API authentication successful', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    method: req.method,
    tokenHash: validTokenHash,
    authResult: 'success'
  });

  next();
}

/**
 * Optional API Token Middleware
 * 
 * Validates token if present but doesn't require it.
 * Useful for endpoints that behave differently based on authentication status.
 */
export function optionalApiToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No token provided - continue without auth
    req.auth = { tokenValid: false };
    return next();
  }

  // Token provided - validate it
  requireApiToken(req, res, next);
}

/**
 * Token Validation Utility
 * 
 * Standalone function to validate tokens without middleware overhead.
 * Useful for custom authentication logic.
 */
export function validateApiToken(token: string): boolean {
  const apiToken = process.env.API_TOKEN;
  
  if (!apiToken || !token) {
    return false;
  }

  // Constant-time comparison
  const providedBuffer = Buffer.from(token, 'utf8');
  const expectedBuffer = Buffer.from(apiToken, 'utf8');
  
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  let isValid = true;
  for (let i = 0; i < providedBuffer.length; i++) {
    isValid = isValid && (providedBuffer[i] === expectedBuffer[i]);
  }

  return isValid;
}

/**
 * Generate secure token hash for logging
 * 
 * Creates a truncated SHA-256 hash for secure token identification in logs.
 */
export function createTokenHash(token: string): string {
  return crypto.createHash('sha256')
    .update(token)
    .digest('hex')
    .substring(0, 8);
}