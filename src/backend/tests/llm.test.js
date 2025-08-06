const request = require('supertest');
const express = require('express');
const llmRoutes = require('../routes/llm');
const llmController = require('../controllers/llmController');

// Mock the controller
jest.mock('../controllers/llmController', () => ({
  startProcessing: jest.fn(),
  getStatus: jest.fn(),
  cancelProcessing: jest.fn(),
  retryProcessing: jest.fn(),
  getResults: jest.fn(),
  downloadConfig: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/llm', llmRoutes);

describe('LLM Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/llm/process/:projectId', () => {
    it('should start processing for a valid project', async () => {
      const mockResponse = {
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Processing started'
      };

      llmController.startProcessing.mockImplementation((req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .post('/api/llm/process/test-project-id')
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(llmController.startProcessing).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when starting processing', async () => {
      llmController.startProcessing.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Failed to start processing' });
      });

      const response = await request(app)
        .post('/api/llm/process/invalid-project')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to start processing' });
    });
  });

  describe('GET /api/llm/status/:jobId', () => {
    it('should return job status for valid job ID', async () => {
      const mockStatus = {
        jobId: 'test-job-id',
        projectId: 'test-project',
        status: 'processing',
        progress: {
          total: 10,
          completed: 5,
          failed: 0,
          current: 'test-file.js',
          percentage: 50
        }
      };

      llmController.getStatus.mockImplementation((req, res) => {
        res.json(mockStatus);
      });

      const response = await request(app)
        .get('/api/llm/status/test-job-id')
        .expect(200);

      expect(response.body).toEqual(mockStatus);
      expect(llmController.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent job', async () => {
      llmController.getStatus.mockImplementation((req, res) => {
        res.status(404).json({ error: 'Job not found' });
      });

      const response = await request(app)
        .get('/api/llm/status/non-existent-job')
        .expect(404);

      expect(response.body).toEqual({ error: 'Job not found' });
    });
  });

  describe('POST /api/llm/cancel/:jobId', () => {
    it('should cancel processing for valid job ID', async () => {
      const mockResponse = {
        jobId: 'test-job-id',
        status: 'cancelled',
        message: 'Processing cancelled'
      };

      llmController.cancelProcessing.mockImplementation((req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .post('/api/llm/cancel/test-job-id')
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(llmController.cancelProcessing).toHaveBeenCalledTimes(1);
    });

    it('should handle cancellation errors', async () => {
      llmController.cancelProcessing.mockImplementation((req, res) => {
        res.status(400).json({ error: 'Cannot cancel completed job' });
      });

      const response = await request(app)
        .post('/api/llm/cancel/completed-job-id')
        .expect(400);

      expect(response.body).toEqual({ error: 'Cannot cancel completed job' });
    });
  });

  describe('POST /api/llm/retry/:jobId', () => {
    it('should retry processing for failed job', async () => {
      const mockResponse = {
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Processing restarted',
        retryCount: 1
      };

      llmController.retryProcessing.mockImplementation((req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .post('/api/llm/retry/test-job-id')
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(llmController.retryProcessing).toHaveBeenCalledTimes(1);
    });

    it('should handle retry errors', async () => {
      llmController.retryProcessing.mockImplementation((req, res) => {
        res.status(400).json({ error: 'Can only retry failed jobs' });
      });

      const response = await request(app)
        .post('/api/llm/retry/active-job-id')
        .expect(400);

      expect(response.body).toEqual({ error: 'Can only retry failed jobs' });
    });
  });

  describe('GET /api/llm/results/:jobId', () => {
    it('should return results for completed job', async () => {
      const mockResults = {
        jobId: 'test-job-id',
        projectId: 'test-project',
        status: 'completed',
        summary: {
          jobId: 'test-job-id',
          totalFiles: 5,
          completedAt: '2025-08-04T12:00:00Z',
          files: []
        },
        exportPath: '/exports/test-job-id',
        processedFiles: []
      };

      llmController.getResults.mockImplementation((req, res) => {
        res.json(mockResults);
      });

      const response = await request(app)
        .get('/api/llm/results/test-job-id')
        .expect(200);

      expect(response.body).toEqual(mockResults);
      expect(llmController.getResults).toHaveBeenCalledTimes(1);
    });

    it('should handle results errors', async () => {
      llmController.getResults.mockImplementation((req, res) => {
        res.status(400).json({ error: 'Job not completed yet' });
      });

      const response = await request(app)
        .get('/api/llm/results/incomplete-job-id')
        .expect(400);

      expect(response.body).toEqual({ error: 'Job not completed yet' });
    });
  });
});
