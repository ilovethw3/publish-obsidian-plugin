import sqlite3 from 'sqlite3';
import path from 'path';
import { logger } from '../middleware/logger';

export class Database {
  private static instance: Database;
  private db: sqlite3.Database;

  private constructor() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/posts.db');
    
    // Enable verbose mode for debugging in development
    if (process.env.NODE_ENV !== 'production') {
      sqlite3.verbose();
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Failed to connect to SQLite database', { error: err.message, path: dbPath });
        throw err;
      } else {
        logger.info('Connected to SQLite database', { path: dbPath });
        this.initializeSchema();
      }
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initializeSchema(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_id ON posts(id)'
    ];

    this.db.serialize(() => {
      // Create table
      this.db.run(createTableSQL, (err) => {
        if (err) {
          logger.error('Failed to create posts table', { error: err.message });
          throw err;
        } else {
          logger.info('Posts table ready');
        }
      });

      // Create indexes
      createIndexesSQL.forEach((indexSQL) => {
        this.db.run(indexSQL, (err) => {
          if (err) {
            logger.error('Failed to create index', { error: err.message, sql: indexSQL });
          }
        });
      });
    });
  }

  public getDatabase(): sqlite3.Database {
    return this.db;
  }

  // Helper method to run queries with promises
  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Helper method to get a single row
  public get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  // Helper method to get all rows
  public all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  public close(): void {
    this.db.close((err) => {
      if (err) {
        logger.error('Failed to close database', { error: err.message });
      } else {
        logger.info('Database connection closed');
      }
    });
  }
}