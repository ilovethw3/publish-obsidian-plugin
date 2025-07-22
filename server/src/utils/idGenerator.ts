import { v4 as uuidv4 } from 'uuid';
import { logger } from '../middleware/logger';

export class IDGenerator {
  // Characters for short ID generation (excluding confusing ones: 0, O, 1, I, l)
  private static readonly CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  private static readonly ID_LENGTH = 8;

  /**
   * Generate a random 8-character ID
   */
  static generate(): string {
    let result = '';
    for (let i = 0; i < this.ID_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARS.length);
      result += this.CHARS[randomIndex];
    }
    return result;
  }

  /**
   * Generate a unique ID by checking against existing IDs
   */
  static async generateUnique(
    checkExists: (id: string) => Promise<boolean>,
    maxAttempts: number = 10
  ): Promise<string> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const id = this.generate();
      
      try {
        const exists = await checkExists(id);
        if (!exists) {
          logger.debug('Generated unique ID', { id, attempts: attempts + 1 });
          return id;
        }
      } catch (error) {
        logger.error('Error checking ID uniqueness', { error, id, attempt: attempts + 1 });
        throw error;
      }
      
      attempts++;
      logger.warn('ID collision detected, retrying', { id, attempt: attempts });
    }
    
    const error = new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
    logger.error('Unique ID generation failed', { maxAttempts });
    throw error;
  }

  /**
   * Validate ID format
   */
  static isValidFormat(id: string): boolean {
    if (typeof id !== 'string' || id.length !== this.ID_LENGTH) {
      return false;
    }
    
    // Check if all characters are valid
    for (const char of id) {
      if (!this.CHARS.includes(char)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate a UUID v4 secret
   */
  static generateSecret(): string {
    return uuidv4();
  }

  /**
   * Validate UUID v4 format
   */
  static isValidSecret(secret: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(secret);
  }

  /**
   * Time-safe secret comparison to prevent timing attacks
   */
  static compareSecrets(provided: string, stored: string): boolean {
    if (provided.length !== stored.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < provided.length; i++) {
      result |= provided.charCodeAt(i) ^ stored.charCodeAt(i);
    }

    return result === 0;
  }
}