const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const traceabilityController = require('../../../src/backend/controllers/traceabilityController');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

jest.mock('axios');
const mockedAxios = axios;

describe('TraceabilityController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      download: jest.fn()
    };
    
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.OPENAPI_ENDPOINT = 'http://localhost:1234';
    process.env.OPENAPI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performConsistencyCheck', () => {
    it('should perform consistency check successfully', async () => {
      req.params.jobId = 'test-job-123';
      
      // Mock file system operations
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test-file.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile
        .mockResolvedValueOnce('# Test content')
        .mockResolvedValueOnce('{"totalFiles": 1}');
      fs.writeFile.mockResolvedValue();

      // Mock axios response
      const mockLLMResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                files: [{
                  path: 'test-file.md',
                  content: '# Updated content',
                  hasChanges: true,
                  changeReason: 'Fixed formatting'
                }],
                summary: 'All files checked'
              })
            }
          }]
        }
      };
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockLLMResponse)
      });

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consistency check completed',
        filesUpdated: ['test-file.md'],
        totalFilesChecked: 1
      });
    });

    it('should handle missing export directory', async () => {
      req.params.jobId = 'nonexistent-job';
      
      fs.access.mockRejectedValue(new Error('Directory not found'));

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Export directory not found' });
    });

    it('should handle LLM API errors', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test-file.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile.mockResolvedValue('# Test content');

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue({
          response: { status: 429 }
        })
      });

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    });

    it('should handle unauthorized API access', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test-file.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile.mockResolvedValue('# Test content');

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue({
          response: { status: 401 }
        })
      });

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Invalid API key. Please check your OpenAPI configuration.' 
      });
    });
  });

  describe('generateReport', () => {
    it('should generate traceability report successfully', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify({
        projectId: 'test-project',
        totalFiles: 5,
        completedAt: '2023-01-01T00:00:00.000Z'
      }));
      fs.writeFile.mockResolvedValue();

      await traceabilityController.generateReport(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Traceability report generated successfully',
          analysis: expect.any(Object)
        })
      );
    });

    it('should handle missing export directory for report generation', async () => {
      req.params.jobId = 'nonexistent-job';
      
      fs.access.mockRejectedValue(new Error('Directory not found'));

      await traceabilityController.generateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Export directory not found' });
    });
  });

  describe('getReport', () => {
    it('should return existing report content', async () => {
      req.params.jobId = 'test-job-123';
      
      const reportContent = '# Traceability Report\n\nThis is a test report.';
      fs.readFile.mockResolvedValue(reportContent);

      await traceabilityController.getReport(req, res);

      expect(res.json).toHaveBeenCalledWith({
        content: reportContent,
        jobId: 'test-job-123'
      });
    });

    it('should handle missing report file', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await traceabilityController.getReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Traceability report not found' });
    });
  });

  describe('downloadReport', () => {
    it('should download report file successfully', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();

      await traceabilityController.downloadReport(req, res);

      expect(res.download).toHaveBeenCalledWith(
        expect.stringContaining('traceability-report.md'),
        'traceability-report-test-job-123.md'
      );
    });

    it('should handle missing report file for download', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockRejectedValue(new Error('File not found'));

      await traceabilityController.downloadReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Traceability report not found' });
    });
  });

  describe('helper functions', () => {
    describe('calculateCompletenessScore', () => {
      it('should calculate correct completeness score', () => {
        const analysis = {
          projectDocuments: [
            { name: 'README.md', type: 'Documentation' },
            { name: 'requirements.txt', type: 'Configuration' }
          ],
          processedFiles: [
            { name: 'file1.md' },
            { name: 'file2.md' }
          ],
          totalFiles: 2,
          consistencyCheck: { completedAt: '2023-01-01' }
        };

        // Import the helper function for testing
        const { calculateCompletenessScore } = require('../../../src/backend/controllers/traceabilityController');
        const score = calculateCompletenessScore(analysis);

        expect(score).toBeGreaterThan(80); // Should have high score with all components
      });
    });

    describe('identifyGaps', () => {
      it('should identify missing documentation gaps', () => {
        const analysis = {
          projectDocuments: [],
          consistencyCheck: null
        };

        const { identifyGaps } = require('../../../src/backend/controllers/traceabilityController');
        const gaps = identifyGaps(analysis);

        expect(gaps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'Documentation',
              description: 'Missing README.md file',
              impact: 'High'
            })
          ])
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty processed files directory', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([]);

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'No processed files found for consistency check' 
      });
    });

    it('should handle malformed LLM response', async () => {
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test-file.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile
        .mockResolvedValueOnce('# Test content')
        .mockResolvedValueOnce('{"totalFiles": 1}');

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: {
            choices: [{
              message: {
                content: 'Invalid JSON response'
              }
            }]
          }
        })
      });

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consistency check completed',
        filesUpdated: [],
        totalFilesChecked: 1
      });
    });

    it('should handle missing environment variables', async () => {
      delete process.env.OPENAPI_ENDPOINT;
      delete process.env.OPENAPI_API_KEY;
      
      req.params.jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test-file.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile.mockResolvedValue('# Test content');

      await traceabilityController.performConsistencyCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'OpenAPI endpoint and API key must be configured' 
      });
    });
  });
});
