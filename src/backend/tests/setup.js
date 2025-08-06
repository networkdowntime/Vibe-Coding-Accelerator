// Test setup file
import { jest } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Suppress console output in tests unless NODE_ENV is set to 'test-verbose'
  log: process.env.NODE_ENV === 'test-verbose' ? console.log : jest.fn(),
  debug: process.env.NODE_ENV === 'test-verbose' ? console.debug : jest.fn(),
  info: process.env.NODE_ENV === 'test-verbose' ? console.info : jest.fn(),
  warn: process.env.NODE_ENV === 'test-verbose' ? console.warn : jest.fn(),
  error: process.env.NODE_ENV === 'test-verbose' ? console.error : jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.PROJECT_STORAGE_PATH = './test-projects';
process.env.AI_AGENTS_PATH = './test-ai-agents';
process.env.LOG_LEVEL = 'error';
