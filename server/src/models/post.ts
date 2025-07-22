import { Database } from './database';
import { Post } from '../../../shared/types';
import { logger } from '../middleware/logger';

export interface CreatePostData {
  id: string;
  secret: string;
  title: string;
  content: string;
}

export interface UpdatePostData {
  title: string;
  content: string;
}

export class PostModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Create a new post
   */
  async create(postData: CreatePostData): Promise<Post> {
    const { id, secret, title, content } = postData;
    
    try {
      const sql = `
        INSERT INTO posts (id, secret, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      
      await this.db.run(sql, [id, secret, title, content]);
      
      // Fetch the created post
      const createdPost = await this.findById(id);
      if (!createdPost) {
        throw new Error('Failed to create post');
      }

      logger.info('Post created successfully', { id, title: title.substring(0, 50) });
      return createdPost;
      
    } catch (error) {
      logger.error('Failed to create post', { error, id, title });
      throw error;
    }
  }

  /**
   * Find a post by ID
   */
  async findById(id: string): Promise<Post | null> {
    try {
      const sql = 'SELECT * FROM posts WHERE id = ?';
      const post = await this.db.get<Post>(sql, [id]);
      
      if (!post) {
        logger.debug('Post not found', { id });
        return null;
      }

      return post;
      
    } catch (error) {
      logger.error('Failed to find post by ID', { error, id });
      throw error;
    }
  }

  /**
   * Find a post by ID and verify secret
   */
  async findByIdAndSecret(id: string, secret: string): Promise<Post | null> {
    try {
      const sql = 'SELECT * FROM posts WHERE id = ? AND secret = ?';
      const post = await this.db.get<Post>(sql, [id, secret]);
      
      if (!post) {
        logger.debug('Post not found or invalid secret', { id });
        return null;
      }

      return post;
      
    } catch (error) {
      logger.error('Failed to find post by ID and secret', { error, id });
      throw error;
    }
  }

  /**
   * Update an existing post
   */
  async update(id: string, secret: string, updates: UpdatePostData): Promise<boolean> {
    const { title, content } = updates;
    
    try {
      const sql = `
        UPDATE posts 
        SET title = ?, content = ?, updated_at = datetime('now')
        WHERE id = ? AND secret = ?
      `;
      
      const result = await this.db.run(sql, [title, content, id, secret]);
      
      if (result.changes === 0) {
        logger.debug('Post not found or invalid secret for update', { id });
        return false;
      }

      logger.info('Post updated successfully', { id, title: title.substring(0, 50) });
      return true;
      
    } catch (error) {
      logger.error('Failed to update post', { error, id, title });
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async delete(id: string, secret: string): Promise<boolean> {
    try {
      const sql = 'DELETE FROM posts WHERE id = ? AND secret = ?';
      const result = await this.db.run(sql, [id, secret]);
      
      if (result.changes === 0) {
        logger.debug('Post not found or invalid secret for deletion', { id });
        return false;
      }

      logger.info('Post deleted successfully', { id });
      return true;
      
    } catch (error) {
      logger.error('Failed to delete post', { error, id });
      throw error;
    }
  }

  /**
   * Check if a post ID exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const sql = 'SELECT 1 FROM posts WHERE id = ? LIMIT 1';
      const result = await this.db.get(sql, [id]);
      return !!result;
      
    } catch (error) {
      logger.error('Failed to check if post exists', { error, id });
      throw error;
    }
  }

  /**
   * Get all posts (for admin/debugging purposes)
   */
  async getAll(limit: number = 50, offset: number = 0): Promise<Post[]> {
    try {
      const sql = `
        SELECT * FROM posts 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const posts = await this.db.all<Post>(sql, [limit, offset]);
      
      logger.debug('Retrieved posts', { count: posts.length, limit, offset });
      return posts;
      
    } catch (error) {
      logger.error('Failed to get all posts', { error, limit, offset });
      throw error;
    }
  }

  /**
   * Get post count
   */
  async getCount(): Promise<number> {
    try {
      const sql = 'SELECT COUNT(*) as count FROM posts';
      const result = await this.db.get<{ count: number }>(sql);
      return result?.count || 0;
      
    } catch (error) {
      logger.error('Failed to get post count', { error });
      throw error;
    }
  }
}