import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { PostModel } from '../models/post';
import { IDGenerator } from '../utils/idGenerator';
import { MarkdownRenderer } from '../utils/markdown';
import { createError } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import { 
  CreatePostRequest, 
  CreatePostResponse, 
  UpdatePostRequest, 
  DeletePostRequest 
} from 'shared/types';

const router = express.Router();
const postModel = new PostModel();
const markdownRenderer = new MarkdownRenderer();

// Validation middleware
const createPostValidation = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim()
    .escape(),
  body('content')
    .isLength({ min: 1, max: 100000 })
    .withMessage('Content must be between 1 and 100,000 characters')
    .trim()
];

const updatePostValidation = [
  param('id').isLength({ min: 8, max: 8 }).withMessage('Invalid post ID format'),
  body('secret').isUUID(4).withMessage('Invalid secret format'),
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim()
    .escape(),
  body('content')
    .isLength({ min: 1, max: 100000 })
    .withMessage('Content must be between 1 and 100,000 characters')
    .trim()
];

const deletePostValidation = [
  param('id').isLength({ min: 8, max: 8 }).withMessage('Invalid post ID format'),
  body('secret').isUUID(4).withMessage('Invalid secret format')
];

const getPostValidation = [
  param('id').isLength({ min: 8, max: 8 }).withMessage('Invalid post ID format')
];

// Helper function to handle validation errors
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

/**
 * POST / - Create a new post
 */
router.post('/', 
  createPostValidation,
  handleValidationErrors,
  async (req: express.Request<{}, CreatePostResponse, CreatePostRequest>, res: express.Response<CreatePostResponse>, next: express.NextFunction) => {
    try {
      const { title, content } = req.body;

      // Generate unique ID and secret
      const id = await IDGenerator.generateUnique((id) => postModel.exists(id));
      const secret = IDGenerator.generateSecret();

      // Create the post
      const post = await postModel.create({
        id,
        secret,
        title,
        content
      });

      logger.info('Post created via API', { 
        id, 
        title: title.substring(0, 50),
        contentLength: content.length 
      });

      res.status(201).json({ id, secret });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /:id - Get a post and render as HTML
 */
router.get('/:id',
  getPostValidation,
  handleValidationErrors,
  async (req: express.Request<{ id: string }>, res: express.Response, next: express.NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!IDGenerator.isValidFormat(id)) {
        throw createError('Invalid post ID format', 400);
      }

      // Find the post
      const post = await postModel.findById(id);
      if (!post) {
        throw createError('Post not found', 404);
      }

      // Check if client wants JSON
      if (req.headers.accept?.includes('application/json')) {
        res.json({
          success: true,
          data: {
            id: post.id,
            title: post.title,
            content: post.content,
            created_at: post.created_at,
            updated_at: post.updated_at
          }
        });
        return;
      }

      // Render as HTML
      const html = await markdownRenderer.renderToHtml(post);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);

      logger.info('Post viewed', { id, title: post.title.substring(0, 50) });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /:id - Update an existing post
 */
router.put('/:id',
  updatePostValidation,
  handleValidationErrors,
  async (req: express.Request<{ id: string }, {}, UpdatePostRequest>, res: express.Response, next: express.NextFunction) => {
    try {
      const { id } = req.params;
      const { secret, title, content } = req.body;

      // Validate ID format
      if (!IDGenerator.isValidFormat(id)) {
        throw createError('Invalid post ID format', 400);
      }

      // Validate secret format
      if (!IDGenerator.isValidSecret(secret)) {
        throw createError('Invalid secret format', 400);
      }

      // Update the post
      const updated = await postModel.update(id, secret, { title, content });
      
      if (!updated) {
        throw createError('Post not found or invalid secret', 401);
      }

      logger.info('Post updated via API', { 
        id, 
        title: title.substring(0, 50),
        contentLength: content.length 
      });

      res.status(204).send();

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /:id - Delete a post
 */
router.delete('/:id',
  deletePostValidation,
  handleValidationErrors,
  async (req: express.Request<{ id: string }, {}, DeletePostRequest>, res: express.Response, next: express.NextFunction) => {
    try {
      const { id } = req.params;
      const { secret } = req.body;

      // Validate ID format
      if (!IDGenerator.isValidFormat(id)) {
        throw createError('Invalid post ID format', 400);
      }

      // Validate secret format
      if (!IDGenerator.isValidSecret(secret)) {
        throw createError('Invalid secret format', 400);
      }

      // Delete the post
      const deleted = await postModel.delete(id, secret);
      
      if (!deleted) {
        throw createError('Post not found or invalid secret', 401);
      }

      logger.info('Post deleted via API', { id });

      res.status(204).send();

    } catch (error) {
      next(error);
    }
  }
);

export { router as postsRouter };