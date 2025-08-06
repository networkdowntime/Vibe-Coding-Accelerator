const request = require('supertest');
const app = require('../../server');
const fs = require('fs').promises;
const path = require('path');

// Mock axios at the top level
jest.mock('axios');
// Mock fs at the top level
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn()
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn()
}));

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
    
    // Reset axios mocks
    jest.clearAllMocks();
    
    // Mock fs.readFile to return empty .env content by default
    fs.readFile.mockResolvedValue('');
  });

  describe('GET /api/settings/openapi', () => {
    it('should return empty settings when not configured', async () => {
      // Mock fs.readFile to simulate no .env file
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      const res = await request(app).get('/api/settings/openapi');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        endpoint: '',
        hasApiKey: false,
        isConfigured: false
      });
    });

    it('should return current settings when configured', async () => {
      // Mock fs.readFile to return environment variables
      fs.readFile.mockResolvedValue('OPENAPI_ENDPOINT=https://test-endpoint.com\nOPENAPI_API_KEY=test-key');
      
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

    it('should save settings successfully without API key (optional)', async () => {
      const settings = {
        endpoint: 'https://test-endpoint.com'
      };

      const res = await request(app)
        .put('/api/settings/openapi')
        .send(settings);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('OpenAPI settings updated successfully');
      expect(res.body.settings.endpoint).toBe('https://test-endpoint.com');
      expect(res.body.settings.hasApiKey).toBe(false);
      expect(res.body.settings.isConfigured).toBe(true);
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
      // Mock fs.readFile to simulate no .env file (should return empty object)
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('OpenAPI endpoint must be configured before testing');
    });

    it('should handle connection errors gracefully', async () => {
      // Mock fs.readFile to return environment variables
      fs.readFile.mockResolvedValue('OPENAPI_ENDPOINT=https://nonexistent-endpoint.invalid\nOPENAPI_API_KEY=test-key');
      
      // Mock axios to simulate connection error
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND nonexistent-endpoint.invalid'
      });

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Endpoint not found');
    });

    it('should handle timeout errors', async () => {
      // Mock fs.readFile to return environment variables
      fs.readFile.mockResolvedValue('OPENAPI_ENDPOINT=https://slow-endpoint.com\nOPENAPI_API_KEY=test-key');
      
      // Mock axios to simulate timeout
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue({
        code: 'ETIMEDOUT',
        message: 'timeout of 30000ms exceeded'
      });

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(408);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Connection timeout');
    });

    it('should handle authentication errors', async () => {
      // Mock fs.readFile to return environment variables
      fs.readFile.mockResolvedValue('OPENAPI_ENDPOINT=https://test-endpoint.com\nOPENAPI_API_KEY=invalid-key');
      
      // Mock axios to simulate 401 response
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        },
        message: 'Request failed with status code 401'
      });

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication failed');
    });

    it('should handle successful connection', async () => {
      // Mock fs.readFile to return environment variables
      fs.readFile.mockResolvedValue('OPENAPI_ENDPOINT=https://test-endpoint.com\nOPENAPI_API_KEY=test-key');
      
      // Mock axios to simulate successful response
      const axios = require('axios');
      axios.get = jest.fn().mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: 'gpt-3.5-turbo',
              object: 'model'
            }
          ]
        }
      });

      const res = await request(app).post('/api/settings/openapi/test');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Connection successful');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock fs.readFile to return empty object (normal behavior on file system error)
      fs.readFile.mockRejectedValue(new Error('File system error'));

      const res = await request(app).get('/api/settings/openapi');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        endpoint: '',
        hasApiKey: false,
        isConfigured: false
      });
    });
  });
});
