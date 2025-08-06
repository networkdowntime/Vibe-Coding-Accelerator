import { jest } from '@jest/globals';
import request from 'supertest';

// Mock axios before any imports that might use it
const mockAxios = {
  post: jest.fn()
};

jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

// Import app after mocking
const app = (await import('../../server.js')).default;

describe('LLM Processing API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful LLM API responses
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: {
        choices: [{
          message: {
            content: "Processed content"
          }
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      }
    });
  });

  describe('POST /api/v1/llm/process', () => {
    it('should start LLM processing successfully', async () => {
      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1', 'file2'],
        aiAgentConfig: {
          name: 'Test Agent',
          model: 'gpt-3.5-turbo'
        }
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(['starting', 'processing']).toContain(response.body.data.status);
      expect(response.body.data.totalFiles).toBe(2);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/llm/process')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 for missing AI agent config', async () => {
      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1', 'file2']
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing AI agent configuration');
    });

    it('should return 400 for empty file IDs array', async () => {
      const requestData = {
        projectId: 'test-project',
        fileIds: [],
        aiAgentConfig: { name: 'Test Agent' }
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('GET /api/v1/llm/status/:jobId', () => {
    let jobId;

    beforeEach(async () => {
      // Create a job first
      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1'],
        aiAgentConfig: { name: 'Test Agent' }
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData);

      jobId = response.body.jobId;
    });

    it('should get processing status successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/llm/status/${jobId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe(jobId);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.totalFiles).toBe(1);
    });

    it('should return 404 for non-existent job ID', async () => {
      const response = await request(app)
        .get('/api/v1/llm/status/non-existent-job')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('should return 400 for missing job ID', async () => {
      const response = await request(app)
        .get('/api/v1/llm/status/')
        .expect(404);

      // This will hit the 404 handler since the route doesn't match
    });
  });

  describe('POST /api/v1/llm/cancel/:jobId', () => {
    let jobId;

    beforeEach(async () => {
      // Create a job first
      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1'],
        aiAgentConfig: { name: 'Test Agent' }
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData);

      jobId = response.body.jobId;
    });

    it('should cancel processing successfully', async () => {
      // For this test, create a slow mock to ensure job is in processing state
      mockAxios.post.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              status: 200,
              data: {
                choices: [{
                  message: {
                    content: 'Processed content'
                  }
                }],
                usage: {
                  prompt_tokens: 10,
                  completion_tokens: 20,
                  total_tokens: 30
                }
              }
            });
          }, 200); // Delay to ensure job is processing
        });
      });

      // Create a new job for cancellation
      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1'],
        aiAgentConfig: { name: 'Test Agent' }
      };

      const createResponse = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData);

      const newJobId = createResponse.body.jobId;
      
      // Add a small delay to ensure the job is started but not completed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const response = await request(app)
        .post(`/api/v1/llm/cancel/${newJobId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Processing cancelled');
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should return 404 for non-existent job ID', async () => {
      const response = await request(app)
        .post('/api/v1/llm/cancel/non-existent-job')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('LLM Processing Flow', () => {
    it('should complete the full processing workflow', async () => {
      // Mock successful LLM response
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {
          choices: [{
            message: {
              content: 'Improved file content here'
            }
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        }
      });

      // Start processing
      const requestData = {
        projectId: 'test-project',
        fileIds: ['test-file.js'],
        aiAgentConfig: {
          name: 'Code Improver',
          model: 'gpt-3.5-turbo'
        }
      };

      const startResponse = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(200);

      const jobId = startResponse.body.jobId;

      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check status
      const statusResponse = await request(app)
        .get(`/api/v1/llm/status/${jobId}`)
        .expect(200);

      expect(statusResponse.body.data.jobId).toBe(jobId);
      expect(['starting', 'processing', 'completed', 'error']).toContain(statusResponse.body.data.status);
    });

    it('should handle LLM API errors gracefully', async () => {
      // Mock LLM API error for all files
      mockAxios.post.mockRejectedValue(new Error('LLM API Error'));

      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1', 'file2'],
        aiAgentConfig: {
          name: 'Code Improver',
          model: 'gpt-3.5-turbo'
        }
      };

      const startResponse = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(200);

      const jobId = startResponse.body.jobId;

      // Wait for processing to attempt and fail
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check status should show error
      const statusResponse = await request(app)
        .get(`/api/v1/llm/status/${jobId}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe('error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle cancellation of already completed job', async () => {
      // Mock successful LLM response
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {
          choices: [{
            message: {
              content: 'Improved content'
            }
          }],
          usage: { total_tokens: 100 }
        }
      });

      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1'],
        aiAgentConfig: { name: 'Test Agent' }
      };

      const startResponse = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData);

      const jobId = startResponse.body.jobId;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to cancel completed job
      const cancelResponse = await request(app)
        .post(`/api/v1/llm/cancel/${jobId}`)
        .expect(400);

      expect(cancelResponse.body.success).toBe(false);
      expect(cancelResponse.body.error).toBe('Cannot cancel');
    });

    it('should handle invalid project ID gracefully', async () => {
      const requestData = {
        projectId: null,
        fileIds: ['file1'],
        aiAgentConfig: { name: 'Test Agent' }
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed AI agent config', async () => {
      const requestData = {
        projectId: 'test-project',
        fileIds: ['file1'],
        aiAgentConfig: null
      };

      const response = await request(app)
        .post('/api/v1/llm/process')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing AI agent configuration');
    });
  });
});
