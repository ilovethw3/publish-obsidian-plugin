import request from 'supertest';
import express from 'express';
import { requireApiToken, validateApiToken, createTokenHash } from '../middleware/auth';

describe('API Token Authentication', () => {
  let app: express.Application;
  const testToken = 'test-api-token-12345678901234567890';
  
  beforeAll(() => {
    // Set test API token
    process.env.API_TOKEN = testToken;
    
    // Create test app
    app = express();
    app.use(express.json());
    
    // Test route with authentication
    app.post('/test-auth', requireApiToken, (req, res) => {
      res.json({ 
        success: true, 
        message: 'Authentication successful',
        tokenHash: req.auth?.tokenHash 
      });
    });
    
    // Test route without authentication for comparison
    app.get('/test-no-auth', (req, res) => {
      res.json({ success: true, message: 'No authentication required' });
    });
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.API_TOKEN;
  });

  describe('requireApiToken middleware', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .post('/test-auth')
        .send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_AUTHORIZATION');
      expect(response.body.error.message).toBe('Authorization header is required');
    });

    it('should reject requests with invalid Authorization header format', async () => {
      const response = await request(app)
        .post('/test-auth')
        .set('Authorization', 'InvalidFormat token123')
        .send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_AUTHORIZATION_FORMAT');
    });

    it('should reject requests with wrong token', async () => {
      const response = await request(app)
        .post('/test-auth')
        .set('Authorization', 'Bearer wrong-token')
        .send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_API_TOKEN');
      expect(response.body.error.message).toBe('Invalid API token');
    });

    it('should accept requests with correct token', async () => {
      const response = await request(app)
        .post('/test-auth')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Authentication successful');
      expect(response.body.tokenHash).toBeDefined();
    });

    it('should handle missing API_TOKEN configuration', async () => {
      // Temporarily remove API_TOKEN
      const originalToken = process.env.API_TOKEN;
      delete process.env.API_TOKEN;

      const response = await request(app)
        .post('/test-auth')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ test: 'data' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('MISSING_API_TOKEN_CONFIG');

      // Restore API_TOKEN
      process.env.API_TOKEN = originalToken;
    });
  });

  describe('validateApiToken utility function', () => {
    it('should return true for valid token', () => {
      const result = validateApiToken(testToken);
      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      const result = validateApiToken('wrong-token');
      expect(result).toBe(false);
    });

    it('should return false for empty token', () => {
      const result = validateApiToken('');
      expect(result).toBe(false);
    });

    it('should return false when API_TOKEN is not set', () => {
      const originalToken = process.env.API_TOKEN;
      delete process.env.API_TOKEN;

      const result = validateApiToken(testToken);
      expect(result).toBe(false);

      process.env.API_TOKEN = originalToken;
    });
  });

  describe('createTokenHash utility function', () => {
    it('should create consistent hash for same token', () => {
      const hash1 = createTokenHash(testToken);
      const hash2 = createTokenHash(testToken);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
    });

    it('should create different hashes for different tokens', () => {
      const hash1 = createTokenHash('token1');
      const hash2 = createTokenHash('token2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create hex-formatted hash', () => {
      const hash = createTokenHash(testToken);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('Security considerations', () => {
    it('should prevent timing attacks with constant-time comparison', async () => {
      const shortToken = 'short';
      const longToken = 'very-long-token-that-is-much-longer';
      
      // Both should be rejected, but timing should be similar
      const start1 = Date.now();
      await request(app)
        .post('/test-auth')
        .set('Authorization', `Bearer ${shortToken}`)
        .send({ test: 'data' });
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .post('/test-auth')
        .set('Authorization', `Bearer ${longToken}`)
        .send({ test: 'data' });
      const time2 = Date.now() - start2;

      // Times should be relatively close (within reasonable margin)
      // This is a basic test - in practice, timing attack prevention
      // requires more sophisticated measurement
      expect(Math.abs(time1 - time2)).toBeLessThan(50); // 50ms margin
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/test-auth')
        .set('Authorization', 'Bearer wrong-token')
        .send({ test: 'data' });

      // Should not expose the actual token or detailed error info
      expect(JSON.stringify(response.body)).not.toContain('wrong-token');
      expect(JSON.stringify(response.body)).not.toContain(testToken);
    });
  });

  describe('Request context', () => {
    it('should add auth info to request object', async () => {
      const response = await request(app)
        .post('/test-auth')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.tokenHash).toBeDefined();
      expect(response.body.tokenHash).toHaveLength(8);
    });
  });
});