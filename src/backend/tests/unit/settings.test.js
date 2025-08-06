import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock axios before importing other modules
jest.unstable_mockModule('axios', () => ({
  default: {
    post: jest.fn()
  }
}));

// Import after mocking
const { default: axios } = await import('axios');
const settingsController = await import('../../controllers/settingsController.js');
const settingsRoutes = await import('../../routes/settings.js');

// Create test Express app
let app;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/settings', settingsRoutes.default);
  
  // Reset mocks before each test
  jest.clearAllMocks();
});

describe('Settings API', () => {
  const testEnvPath = path.join(__dirname, '../../.env.test');
  let originalEnvPath;
  
  beforeEach(async () => {
    // Store original env path and set test env path
    originalEnvPath = settingsController.default.envPath;
    settingsController.default.envPath = testEnvPath;
    
    // Clean up test .env file before each test
    try {
      await fs.unlink(testEnvPath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Restore original env path
    settingsController.default.envPath = originalEnvPath;
    
    // Clean up test .env file after each test
    try {
      await fs.unlink(testEnvPath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  });

  describe('GET /api/v1/settings', () => {
    it('should return default settings when no .env file exists', async () => {
      const response = await request(app)
        .get('/api/v1/settings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        llmEndpoint: '',
        hasApiKey: false,
        isConfigured: false
      });
    });

    it('should return current settings when .env file exists', async () => {
      // Create a test .env file
      const testEnvContent = 'LLM_ENDPOINT=https://api.test.com\nLLM_API_KEY=test-key-123';
      await fs.writeFile(testEnvPath, testEnvContent);

      // Mock the envPath in the controller
      const SettingsController = (await import('../../controllers/settingsController.js')).default;
      const originalEnvPath = SettingsController.envPath;
      SettingsController.envPath = testEnvPath;

      try {
        const response = await request(app)
          .get('/api/v1/settings')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          llmEndpoint: 'https://api.test.com',
          hasApiKey: true,
          isConfigured: true
        });
      } finally {
        SettingsController.envPath = originalEnvPath;
      }
    });
  });

  describe('PUT /api/v1/settings', () => {
    it('should update settings successfully', async () => {
      const settingsData = {
        llmEndpoint: 'https://api.openai.com',
        llmApiKey: 'sk-test123'
      };

      const response = await request(app)
        .put('/api/v1/settings')
        .send(settingsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Settings updated successfully');
    });

    it('should return 400 when missing required fields', async () => {
      const response = await request(app)
        .put('/api/v1/settings')
        .send({ llmEndpoint: 'https://api.openai.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 when invalid URL provided', async () => {
      const settingsData = {
        llmEndpoint: 'invalid-url',
        llmApiKey: 'sk-test123'
      };

      const response = await request(app)
        .put('/api/v1/settings')
        .send(settingsData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid URL');
    });
  });

  describe('POST /api/v1/settings/test-llm', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 400 when missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/settings/test-llm')
        .send({ llmEndpoint: 'https://api.openai.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing credentials');
    });

    it('should return 400 when invalid URL provided', async () => {
      const testData = {
        llmEndpoint: 'invalid-url',
        llmApiKey: 'sk-test123'
      };

      const response = await request(app)
        .post('/api/v1/settings/test-llm')
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid URL');
    });

    it('should return success when LLM connection test passes', async () => {
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { 
          model: 'gpt-3.5-turbo',
          usage: { total_tokens: 10 },
          choices: [{ message: { content: 'OK' } }] 
        }
      });

      const testData = {
        llmEndpoint: 'https://api.openai.com',
        llmApiKey: 'sk-test123'
      };

      const response = await request(app)
        .post('/api/v1/settings/test-llm')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Connection test successful');
      expect(response.body.data).toMatchObject({
        status: 200,
        model: 'gpt-3.5-turbo',
        usage: { total_tokens: 10 }
      });
      expect(axios.post).toHaveBeenCalledWith(
        `${testData.llmEndpoint}/v1/chat/completions`,
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.any(Array),
          max_tokens: 5,
          temperature: 0
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${testData.llmApiKey}`,
            'Content-Type': 'application/json'
          }),
          timeout: 10000
        })
      );
    });

    it('should return error when LLM connection fails with network error', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network Error'));

      const testData = {
        llmEndpoint: 'https://api.openai.com',
        llmApiKey: 'sk-test123'
      };

      const response = await request(app)
        .post('/api/v1/settings/test-llm')
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Connection test failed');
      expect(response.body.message).toBe('Network error');
    });

    it('should return error when LLM API returns unauthorized', async () => {
      const authError = new Error('Request failed with status code 401');
      authError.response = { 
        status: 401, 
        data: { error: { message: 'Invalid API key' } },
        statusText: 'Unauthorized'
      };
      axios.post.mockRejectedValueOnce(authError);

      const testData = {
        llmEndpoint: 'https://api.openai.com',
        llmApiKey: 'sk-invalid123'
      };

      const response = await request(app)
        .post('/api/v1/settings/test-llm')
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Connection test failed');
      expect(response.body.message).toBe('API Error');
      expect(response.body.details).toBe('HTTP 401: Invalid API key');
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ETIMEDOUT';
      axios.post.mockRejectedValueOnce(timeoutError);

      const testData = {
        llmEndpoint: 'https://api.openai.com',
        llmApiKey: 'sk-test123'
      };

      const response = await request(app)
        .post('/api/v1/settings/test-llm')
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Connection test failed');
      expect(response.body.message).toBe('Connection timeout');
      expect(response.body.details).toBe('The LLM endpoint did not respond within 10 seconds.');
    });
  });

  describe('Settings integration tests', () => {
    it('should complete full settings workflow', async () => {
      // Mock the envPath to use a test file
      const SettingsController = (await import('../../controllers/settingsController.js')).default;
      const originalEnvPath = SettingsController.envPath;
      SettingsController.envPath = testEnvPath;

      try {
        // First, verify no settings exist
        let response = await request(app)
          .get('/api/v1/settings')
          .expect(200);

        expect(response.body.data.isConfigured).toBe(false);

        // Update settings
        const settingsData = {
          llmEndpoint: 'https://api.openai.com',
          llmApiKey: 'sk-test123'
        };

        response = await request(app)
          .put('/api/v1/settings')
          .send(settingsData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify settings were saved
        response = await request(app)
          .get('/api/v1/settings')
          .expect(200);

        expect(response.body.data.isConfigured).toBe(true);
        expect(response.body.data.llmEndpoint).toBe(settingsData.llmEndpoint);
        expect(response.body.data.hasApiKey).toBe(true);
      } finally {
        SettingsController.envPath = originalEnvPath;
      }
    });
  });
});
