const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Create test app
const app = express();
app.use(express.json());

// Import routes
const traceabilityRoutes = require('../../../src/backend/routes/traceability');
app.use('/api/traceability', traceabilityRoutes);

// Mock the file system for integration tests
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

// Mock axios
jest.mock('axios');
const mockedAxios = require('axios');

describe('Traceability API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.OPENAPI_ENDPOINT = 'http://localhost:1234';
    process.env.OPENAPI_API_KEY = 'test-api-key';
  });

  describe('POST /api/traceability/consistency/:jobId', () => {
    it('should perform consistency check end-to-end', async () => {
      const jobId = 'test-job-123';
      
      // Mock file system operations
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test-file.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile
        .mockResolvedValueOnce('# Original content')
        .mockResolvedValueOnce(JSON.stringify({ totalFiles: 1 }));
      fs.writeFile.mockResolvedValue();

      // Mock LLM API response
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  files: [{
                    path: 'test-file.md',
                    content: '# Corrected content',
                    hasChanges: true,
                    changeReason: 'Fixed formatting issues'
                  }],
                  summary: 'Consistency check completed'
                })
              }
            }]
          }
        })
      });

      const response = await request(app)
        .post(`/api/traceability/consistency/${jobId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Consistency check completed',
        filesUpdated: ['test-file.md'],
        totalFilesChecked: 1
      });
    });

    it('should handle missing export directory gracefully', async () => {
      const jobId = 'nonexistent-job';
      
      fs.access.mockRejectedValue(new Error('Directory not found'));

      const response = await request(app)
        .post(`/api/traceability/consistency/${jobId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Export directory not found'
      });
    });

    it('should handle LLM API rate limiting', async () => {
      const jobId = 'test-job-123';
      
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

      const response = await request(app)
        .post(`/api/traceability/consistency/${jobId}`)
        .expect(429);

      expect(response.body).toEqual({
        error: 'Rate limit exceeded. Please try again later.'
      });
    });
  });

  describe('GET /api/traceability/report/:jobId', () => {
    it('should generate and return traceability report', async () => {
      const jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify({
        projectId: 'test-project',
        totalFiles: 3,
        completedAt: '2023-01-01T00:00:00.000Z'
      }));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .get(`/api/traceability/report/${jobId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Traceability report generated successfully',
        analysis: expect.objectContaining({
          projectId: 'test-project',
          jobId: jobId
        })
      });
    });

    it('should handle missing project data', async () => {
      const jobId = 'invalid-job';
      
      fs.access.mockRejectedValue(new Error('Directory not found'));

      const response = await request(app)
        .get(`/api/traceability/report/${jobId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Export directory not found'
      });
    });
  });

  describe('GET /api/traceability/report/:jobId/content', () => {
    it('should return existing report content', async () => {
      const jobId = 'test-job-123';
      const reportContent = '# Test Traceability Report\n\nProject analysis complete.';
      
      fs.readFile.mockResolvedValue(reportContent);

      const response = await request(app)
        .get(`/api/traceability/report/${jobId}/content`)
        .expect(200);

      expect(response.body).toEqual({
        content: reportContent,
        jobId: jobId
      });
    });

    it('should return 404 for missing report', async () => {
      const jobId = 'missing-report-job';
      
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .get(`/api/traceability/report/${jobId}/content`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Traceability report not found'
      });
    });
  });

  describe('GET /api/traceability/report/:jobId/download', () => {
    it('should trigger file download', async () => {
      const jobId = 'test-job-123';
      
      fs.access.mockResolvedValue();

      // Mock res.download since supertest can't test file downloads directly
      const originalDownload = express.response.download;
      express.response.download = jest.fn((filePath, filename, callback) => {
        if (callback) callback();
      });

      await request(app)
        .get(`/api/traceability/report/${jobId}/download`)
        .expect(200);

      expect(express.response.download).toHaveBeenCalledWith(
        expect.stringContaining('traceability-report.md'),
        `traceability-report-${jobId}.md`
      );

      // Restore original method
      express.response.download = originalDownload;
    });

    it('should handle missing download file', async () => {
      const jobId = 'no-file-job';
      
      fs.access.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .get(`/api/traceability/report/${jobId}/download`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Traceability report not found'
      });
    });
  });

  describe('Error handling integration', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/traceability/consistency/')
        .expect(404);

      // Express will handle the 404 for malformed routes
      expect(response.status).toBe(404);
    });

    it('should handle internal server errors', async () => {
      const jobId = 'error-job';
      
      // Mock unexpected error
      fs.access.mockImplementation(() => {
        throw new Error('Unexpected filesystem error');
      });

      const response = await request(app)
        .get(`/api/traceability/report/${jobId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required parameters', async () => {
      // Test missing jobId parameter
      const response = await request(app)
        .post('/api/traceability/consistency/')
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('Complex workflow integration', () => {
    it('should handle complete traceability workflow', async () => {
      const jobId = 'workflow-test-123';
      
      // Step 1: Setup mock data
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'file1.md', isFile: () => true, isDirectory: () => false },
        { name: 'file2.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile
        .mockResolvedValueOnce('# File 1 content')
        .mockResolvedValueOnce('# File 2 content')
        .mockResolvedValueOnce(JSON.stringify({ totalFiles: 2, projectId: 'workflow-project' }));
      fs.writeFile.mockResolvedValue();

      // Mock LLM response
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  files: [{
                    path: 'file1.md',
                    content: '# Updated File 1 content',
                    hasChanges: true,
                    changeReason: 'Fixed formatting'
                  }],
                  summary: 'Files reviewed and updated'
                })
              }
            }]
          }
        })
      });

      // Step 2: Perform consistency check
      const consistencyResponse = await request(app)
        .post(`/api/traceability/consistency/${jobId}`)
        .expect(200);

      expect(consistencyResponse.body.success).toBe(true);
      expect(consistencyResponse.body.filesUpdated).toContain('file1.md');

      // Step 3: Generate report
      const reportResponse = await request(app)
        .get(`/api/traceability/report/${jobId}`)
        .expect(200);

      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.analysis.projectId).toBe('workflow-project');

      // Step 4: Verify report content
      fs.readFile.mockResolvedValueOnce('# Generated Report Content');
      
      const contentResponse = await request(app)
        .get(`/api/traceability/report/${jobId}/content`)
        .expect(200);

      expect(contentResponse.body.content).toBe('# Generated Report Content');
    });

    it('should handle partial workflow failures gracefully', async () => {
      const jobId = 'partial-failure-123';
      
      // Step 1: Consistency check succeeds
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'test.md', isFile: () => true, isDirectory: () => false }
      ]);
      fs.readFile
        .mockResolvedValueOnce('# Test content')
        .mockResolvedValueOnce(JSON.stringify({ totalFiles: 1 }));
      fs.writeFile.mockResolvedValue();

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: {
            choices: [{
              message: { content: JSON.stringify({ files: [], summary: 'No changes needed' }) }
            }]
          }
        })
      });

      await request(app)
        .post(`/api/traceability/consistency/${jobId}`)
        .expect(200);

      // Step 2: Report generation fails
      fs.readFile.mockRejectedValueOnce(new Error('Summary file corrupted'));

      const reportResponse = await request(app)
        .get(`/api/traceability/report/${jobId}`)
        .expect(500);

      expect(reportResponse.body).toHaveProperty('error');
    });
  });
});
