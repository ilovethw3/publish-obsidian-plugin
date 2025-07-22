// Test setup file
import { logger } from '../middleware/logger';

// Silence winston logs during testing
beforeAll(() => {
  logger.silent = true;
});

// Clean up after all tests
afterAll(() => {
  logger.silent = false;
});

// Global test timeout
jest.setTimeout(10000);