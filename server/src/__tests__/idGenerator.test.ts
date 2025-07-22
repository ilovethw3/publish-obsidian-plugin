import { IDGenerator } from '../utils/idGenerator';

describe('IDGenerator', () => {
  describe('generate', () => {
    it('should generate an 8-character ID', () => {
      const id = IDGenerator.generate();
      expect(id).toHaveLength(8);
    });

    it('should only contain valid characters', () => {
      const id = IDGenerator.generate();
      const validChars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
      
      for (const char of id) {
        expect(validChars).toContain(char);
      }
    });

    it('should not contain confusing characters', () => {
      const id = IDGenerator.generate();
      const confusingChars = ['0', 'O', '1', 'I', 'l'];
      
      for (const char of confusingChars) {
        expect(id).not.toContain(char);
      }
    });

    it('should generate unique IDs (statistical test)', () => {
      const ids = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        ids.add(IDGenerator.generate());
      }
      
      // Should have very high uniqueness (allowing for some small chance of collision)
      expect(ids.size).toBeGreaterThan(iterations * 0.99);
    });
  });

  describe('generateUnique', () => {
    it('should generate unique ID when no collision', async () => {
      const checkExists = jest.fn().mockResolvedValue(false);
      const id = await IDGenerator.generateUnique(checkExists);
      
      expect(id).toHaveLength(8);
      expect(checkExists).toHaveBeenCalledWith(id);
    });

    it('should retry on collision and succeed', async () => {
      const checkExists = jest.fn()
        .mockResolvedValueOnce(true)  // First ID exists
        .mockResolvedValueOnce(false); // Second ID doesn't exist
      
      const id = await IDGenerator.generateUnique(checkExists);
      
      expect(id).toHaveLength(8);
      expect(checkExists).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max attempts', async () => {
      const checkExists = jest.fn().mockResolvedValue(true); // Always exists
      
      await expect(
        IDGenerator.generateUnique(checkExists, 3)
      ).rejects.toThrow('Failed to generate unique ID after 3 attempts');
      
      expect(checkExists).toHaveBeenCalledTimes(3);
    });
  });

  describe('isValidFormat', () => {
    it('should validate correct format', () => {
      const validId = 'abc12345';
      expect(IDGenerator.isValidFormat(validId)).toBe(true);
    });

    it('should reject wrong length', () => {
      expect(IDGenerator.isValidFormat('short')).toBe(false);
      expect(IDGenerator.isValidFormat('toolongstring')).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(IDGenerator.isValidFormat('abc1234O')).toBe(false); // Contains O
      expect(IDGenerator.isValidFormat('abc1234!')).toBe(false); // Contains !
    });

    it('should reject non-string input', () => {
      expect(IDGenerator.isValidFormat(null as any)).toBe(false);
      expect(IDGenerator.isValidFormat(undefined as any)).toBe(false);
      expect(IDGenerator.isValidFormat(12345678 as any)).toBe(false);
    });
  });

  describe('generateSecret', () => {
    it('should generate valid UUID v4', () => {
      const secret = IDGenerator.generateSecret();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      expect(secret).toMatch(uuidRegex);
    });

    it('should generate unique secrets', () => {
      const secret1 = IDGenerator.generateSecret();
      const secret2 = IDGenerator.generateSecret();
      
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('isValidSecret', () => {
    it('should validate correct UUID v4', () => {
      const validSecret = '123e4567-e89b-42d3-a456-426614174000';
      expect(IDGenerator.isValidSecret(validSecret)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(IDGenerator.isValidSecret('not-a-uuid')).toBe(false);
      expect(IDGenerator.isValidSecret('123e4567-e89b-12d3-a456-426614174000')).toBe(false); // Wrong version
    });
  });

  describe('compareSecrets', () => {
    it('should return true for identical secrets', () => {
      const secret = '123e4567-e89b-42d3-a456-426614174000';
      expect(IDGenerator.compareSecrets(secret, secret)).toBe(true);
    });

    it('should return false for different secrets', () => {
      const secret1 = '123e4567-e89b-42d3-a456-426614174000';
      const secret2 = '987e4567-e89b-42d3-a456-426614174000';
      expect(IDGenerator.compareSecrets(secret1, secret2)).toBe(false);
    });

    it('should return false for different lengths', () => {
      const secret1 = '123e4567-e89b-42d3-a456-426614174000';
      const secret2 = '123e4567-e89b-42d3-a456-42661417400';
      expect(IDGenerator.compareSecrets(secret1, secret2)).toBe(false);
    });

    it('should be time-safe (basic test)', () => {
      const secret1 = '123e4567-e89b-42d3-a456-426614174000';
      const secret2 = 'a23e4567-e89b-42d3-a456-426614174000'; // Different first char
      const secret3 = '123e4567-e89b-42d3-a456-426614174001'; // Different last char
      
      // Both should return false, testing doesn't depend on position
      expect(IDGenerator.compareSecrets(secret1, secret2)).toBe(false);
      expect(IDGenerator.compareSecrets(secret1, secret3)).toBe(false);
    });
  });
});