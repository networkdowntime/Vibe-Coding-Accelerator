const request = require('supertest');
const app = require('../../server');
const fs = require('fs').promises;
const path = require('path');

describe('Settings API', () => {
  let originalEnv;
  const testEnvPath = path.join(process.cwd(), '.env.test');
  
  beforeAll(async () => {
    // Backup original .env
    originalEnv = process.env.OPENAPI_ENDPOINT;
  });

  afterAll(async () => {
    // Restore original environment
    if (originalEnv) {
      process.env.OPENAPI_ENDPOINT = originalEnv;
    }
    
    // Clean up test env file
    try {
      await fs.unlink(testEnvPath);
    } catch (error) {
      // File might not exist, that's okay
    }
  });

  beforeEach(async () => {
    // Clear environment variables for each test
    delete process.env.OPENAPI_ENDPOINT;
    delete process.env.OPENAPI_API_KEY;
  });

  describe('GET /api/settings/openapi', () => {
    it('should return empty settings when not configured', async () => {
      const res = await request(app).get('/api/settings/openapi');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        endpoint: '',
        hasApiKey: false,
        isConfigured: false
      });
    });

    it('should return current settings when configured', async () => {
      // Mock environment variables
      process.env.OPENAPI_ENDPOINT = 'https://test-endpoint.com';
      process.env.OPENAPI_API_KEY = 'test-key';
      
      const res = await request(app).get('/api/settings/openapi');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        endpoint: 'https://test-endpoint.com',
        hasApiKey: true,
        isConfigured: true
      });
    });
  });

  describe('PUT /api/settings/openapi', () => {
    it('should update OpenAPI settings', async () => {
      const settings = {
        endpoint: 'https://new-endpoint.com',
        apiKey: 'new-api-key'
      };

      const res = await request(app)
        .put('/api/settings/openapi')
        .send(settings);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('OpenAPI settings updated successfully');
      expect(res.body.settings).toEqual({
        endpoint: 'https://new-endpoint.com',
        hasApiKey: true,
        isConfigured: true
      });
    });

    it('should return 400 for missing endpoint', async () => {
      const settings = {
        apiKey: 'test-key'
      };

      const res = await request(app)
        .put('/api/settings/openapi')
        .send(settings);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('OpenAPI endpoint is required');
    });

    it('should return 400 for missing API key', async () => {
      const settings = {
        endpoint: 'https://test-endpoint.com'
      };

      const res = await request(app)
        .put('/api/settings/openapi')
        .send(settings);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('API key is required');
    });

    it('should return 400 for invalid URL format', async () => {
      const settings = {
        endpoint: 'not-a-valid-url',
        apiKey: 'test-key'
      };

      const res = await request(app)
        .put('/api/settings/openapi')
        .send(settings);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid endpoint URL format');
    });

    it('should handle empty strings correctly', async () => {
      const settings = {
        endpoint: '   ',
        apiKey: '   '
      };

      const res = await request(app)
        .put('/api/settings/openapi')
        .send(settings);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('OpenAPI endpoint is required');
    });
  });

  describe('POST /api/settings/openapi/test', () => {
    it('should return 400 when settings not configured', async () => {
      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('must be configured before testing');
    });

    it('should handle connection errors gracefully', async () => {
      // Set up invalid endpoint for testing
      process.env.OPENAPI_ENDPOINT = 'https://nonexistent-endpoint.invalid';
      process.env.OPENAPI_API_KEY = 'test-key';

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Endpoint not found');
    });

    it('should handle timeout errors', async () => {
      // Mock axios to simulate timeout
      const axios = require('axios');
      const originalPost = axios.post;
      
      axios.post = jest.fn().mockRejectedValue({
        code: 'ETIMEDOUT',
        message: 'timeout of 30000ms exceeded'
      });

      process.env.OPENAPI_ENDPOINT = 'https://slow-endpoint.com';
      process.env.OPENAPI_API_KEY = 'test-key';

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(408);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Connection timeout');

      // Restore original axios
      axios.post = originalPost;
    });

    it('should handle authentication errors', async () => {
      // Mock axios to simulate 401 response
      const axios = require('axios');
      const originalPost = axios.post;
      
      axios.post = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        },
        message: 'Request failed with status code 401'
      });

      process.env.OPENAPI_ENDPOINT = 'https://test-endpoint.com';
      process.env.OPENAPI_API_KEY = 'invalid-key';

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication failed');

      // Restore original axios
      axios.post = originalPost;
    });

    it('should handle successful connection', async () => {
      // Mock axios to simulate successful response
      const axios = require('axios');
      const originalPost = axios.post;
      
      axios.post = jest.fn().mockResolvedValue({
        status: 200,
        data: {
          choices: [
            {
              message: {
                content: 'Connection successful'
              }
            }
          ]
        }
      });

      process.env.OPENAPI_ENDPOINT = 'https://valid-endpoint.com';
      process.env.OPENAPI_API_KEY = 'valid-key';

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Connection successful');

      // Restore original axios
      axios.post = originalPost;
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock fs.readFile to throw an error
      const fs = require('fs').promises;
      const originalReadFile = fs.readFile;
      
      fs.readFile = jest.fn().mockRejectedValue(new Error('File system error'));

      const res = await request(app).get('/api/settings/openapi');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Failed to load OpenAPI settings');

      // Restore original fs.readFile
      fs.readFile = originalReadFile;
    });
  });
});
