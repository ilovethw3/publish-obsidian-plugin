import request from 'supertest';
import app from '../app';
import { Database } from '../models/database';
import { PostModel } from '../models/post';

// Mock the database for testing
jest.mock('../models/database');

describe('API Endpoints', () => {
  let postModel: PostModel;

  beforeAll(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = ':memory:';
  });

  beforeEach(() => {
    postModel = new PostModel();
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        content: '# Test Content\n\nThis is a test post.'
      };

      const response = await request(app)
        .post('/')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('secret');
      expect(response.body.data.id).toHaveLength(8);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message', 'Validation failed');
    });

    it('should validate title length', async () => {
      const longTitle = 'x'.repeat(201);
      
      const response = await request(app)
        .post('/')
        .send({
          title: longTitle,
          content: 'Valid content'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate content length', async () => {
      const longContent = 'x'.repeat(100001);
      
      const response = await request(app)
        .post('/')
        .send({
          title: 'Valid title',
          content: longContent
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /:id', () => {
    const mockPost = {
      id: 'abc12345',
      secret: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Test Post',
      content: '# Test Content',
      created_at: '2023-01-01 00:00:00',
      updated_at: '2023-01-01 00:00:00'
    };

    it('should return post as HTML by default', async () => {
      jest.spyOn(postModel, 'findById').mockResolvedValue(mockPost);

      const response = await request(app)
        .get('/abc12345')
        .expect(200);

      expect(response.header['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Test Post');
      expect(response.text).toContain('<h1>Test Content</h1>');
    });

    it('should return post as JSON when requested', async () => {
      jest.spyOn(postModel, 'findById').mockResolvedValue(mockPost);

      const response = await request(app)
        .get('/abc12345')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('abc12345');
      expect(response.body.data.title).toBe('Test Post');
      expect(response.body.data).not.toHaveProperty('secret'); // Secret should not be exposed
    });

    it('should return 404 for non-existent post', async () => {
      jest.spyOn(postModel, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .get('/notfound')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Post not found');
    });

    it('should validate ID format', async () => {
      const response = await request(app)
        .get('/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /:id', () => {
    const updateData = {
      secret: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Updated Post',
      content: '# Updated Content'
    };

    it('should update an existing post', async () => {
      jest.spyOn(postModel, 'update').mockResolvedValue(true);

      const response = await request(app)
        .put('/abc12345')
        .send(updateData)
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should return 401 for invalid secret', async () => {
      jest.spyOn(postModel, 'update').mockResolvedValue(false);

      const response = await request(app)
        .put('/abc12345')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Post not found or invalid secret');
    });

    it('should validate secret format', async () => {
      const response = await request(app)
        .put('/abc12345')
        .send({
          ...updateData,
          secret: 'invalid-secret'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:id', () => {
    const deleteData = {
      secret: '123e4567-e89b-42d3-a456-426614174000'
    };

    it('should delete an existing post', async () => {
      jest.spyOn(postModel, 'delete').mockResolvedValue(true);

      const response = await request(app)
        .delete('/abc12345')
        .send(deleteData)
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should return 401 for invalid secret', async () => {
      jest.spyOn(postModel, 'delete').mockResolvedValue(false);

      const response = await request(app)
        .delete('/abc12345')
        .send(deleteData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Post not found or invalid secret');
    });

    it('should validate secret format', async () => {
      const response = await request(app)
        .delete('/abc12345')
        .send({
          secret: 'invalid-secret'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(postModel, 'findById').mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/abc12345')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 500);
    });

    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      // Note: This might be handled by express default 404
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.header).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/')
        .expect(204);

      expect(response.header).toHaveProperty('access-control-allow-methods');
    });
  });
});