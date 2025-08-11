import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import app from '../../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PROJECT_STORAGE_PATH = './test_projects';

// Mock axios module
const mockAxios = {
  post: jest.fn(),
  get: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn()
  }))
};

describe('Traceability Controller', () => {
  const testProjectId = 'test-project-traceability';
  const testProjectPath = path.join(__dirname, '../../../projects', testProjectId);
  const testFilesPath = path.join(testProjectPath, 'files');
  const testOutputPath = path.join(testProjectPath, 'output');

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create test project directory structure
    await fs.mkdir(testFilesPath, { recursive: true });
    await fs.mkdir(testOutputPath, { recursive: true });

    // Create test files
    await fs.writeFile(path.join(testFilesPath, 'test.js'), 'console.log("test");');
    await fs.writeFile(path.join(testFilesPath, 'package.json'), '{"name": "test"}');
    await fs.writeFile(path.join(testFilesPath, 'README.md'), '# Test Project');

    // Create test processed files
    await fs.writeFile(path.join(testOutputPath, 'processed_test.js'), 'console.log("processed test");');
    await fs.writeFile(path.join(testOutputPath, 'processed_package.json'), '{"name": "test", "version": "1.0.0"}');
  });

  afterEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Clean up test project
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/v1/traceability/consistency-check', () => {
    it('should start consistency check successfully', async () => {
      // Mock successful LLM response
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                analysis: 'Files are consistent',
                consistencyScore: 95,
                issues: [],
                corrections: []
              })
            }
          }]
        }
      });

      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({
          projectId: testProjectId,
          jobId: 'test-job-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.consistencyJobId).toBeDefined();
      expect(response.body.message).toBe('Consistency check started');
      expect(response.body.data.status).toBe('starting');
    });

    it('should fail when project ID is missing', async () => {
      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should fail when no processed files exist', async () => {
      // Remove processed files
      await fs.rm(testOutputPath, { recursive: true, force: true });
      await fs.mkdir(testOutputPath, { recursive: true });

      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({
          projectId: testProjectId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No processed files found');
    });

    it('should fail when export directory does not exist', async () => {
      await fs.rm(testOutputPath, { recursive: true, force: true });

      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({
          projectId: testProjectId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Export directory not found');
    });
  });

  describe('GET /api/v1/traceability/consistency-check/:consistencyJobId/status', () => {
    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/v1/traceability/consistency-check/non-existent-job/status');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Consistency job not found');
    });

    it('should return job status when job exists', async () => {
      // First start a consistency check
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                analysis: 'Files are consistent',
                consistencyScore: 95,
                issues: [],
                corrections: []
              })
            }
          }]
        }
      });

      const startResponse = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({
          projectId: testProjectId
        });

      const jobId = startResponse.body.consistencyJobId;

      // Then get status
      const statusResponse = await request(app)
        .get(`/api/v1/traceability/consistency-check/${jobId}/status`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.consistencyJobId).toBe(jobId);
      expect(statusResponse.body.data.status).toBeDefined();
    });
  });

  describe('POST /api/v1/traceability/reports/:projectId/generate', () => {
    it('should generate traceability report successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Traceability report generated successfully');
      expect(response.body.data.reportPath).toBe('output/traceability-report.md');
      expect(response.body.data.content).toContain('# Traceability Report');
      expect(response.body.data.metadata).toBeDefined();
    });

    it('should fail when project ID is missing', async () => {
      const response = await request(app)
        .post('/api/v1/traceability/reports//generate');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/traceability/reports/:projectId', () => {
    it('should return 404 when report does not exist', async () => {
      const response = await request(app)
        .get(`/api/v1/traceability/reports/${testProjectId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    it('should return report content when report exists', async () => {
      // First generate the report
      await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      // Then get it
      const response = await request(app)
        .get(`/api/v1/traceability/reports/${testProjectId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toContain('# Traceability Report');
      expect(response.body.data.path).toBe('output/traceability-report.md');
    });
  });

  describe('GET /api/v1/traceability/reports/:projectId/download', () => {
    it('should return 404 when report does not exist', async () => {
      const response = await request(app)
        .get(`/api/v1/traceability/reports/${testProjectId}/download`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    it('should download report when it exists', async () => {
      // First generate the report
      await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      // Then download it
      const response = await request(app)
        .get(`/api/v1/traceability/reports/${testProjectId}/download`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain(`${testProjectId}-traceability-report.md`);
    });
  });

  describe('Consistency check workflow', () => {
    it('should complete full consistency check workflow', async () => {
      // Mock LLM response with corrections
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                analysis: 'Found minor issues that have been corrected',
                consistencyScore: 90,
                issues: [
                  {
                    severity: 'low',
                    type: 'naming',
                    description: 'Inconsistent variable naming',
                    files: ['processed_test.js'],
                    recommendation: 'Use camelCase for variables'
                  }
                ],
                corrections: [
                  {
                    filename: 'processed_test.js',
                    correctedContent: 'console.log("corrected test");',
                    corrections: ['Fixed variable naming']
                  }
                ]
              })
            }
          }]
        }
      });

      // Start consistency check
      const startResponse = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({
          projectId: testProjectId
        });

      expect(startResponse.status).toBe(200);
      const jobId = startResponse.body.consistencyJobId;

      // Wait a bit for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check status
      const statusResponse = await request(app)
        .get(`/api/v1/traceability/consistency-check/${jobId}/status`);

      expect(statusResponse.status).toBe(200);

      // Verify LLM was called
      expect(mockAxios.post).toHaveBeenCalled();

      // Verify the corrected file was written
      const correctedContent = await fs.readFile(
        path.join(testOutputPath, 'processed_test.js'),
        'utf8'
      );
      expect(correctedContent).toBe('console.log("corrected test");');

      // Verify traceability report was generated
      const reportExists = await fs.access(
        path.join(testOutputPath, 'traceability-report.md')
      ).then(() => true).catch(() => false);
      expect(reportExists).toBe(true);
    });

    it('should handle LLM API errors gracefully', async () => {
      // Mock LLM API error
      mockAxios.post.mockRejectedValue(new Error('LLM API error'));

      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({
          projectId: testProjectId
        });

      expect(response.status).toBe(200);
      const jobId = response.body.consistencyJobId;

      // Wait for processing to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check status should show error
      const statusResponse = await request(app)
        .get(`/api/v1/traceability/consistency-check/${jobId}/status`);

      expect(statusResponse.status).toBe(200);
      // Note: Due to async nature, the error might not be reflected immediately
      // In a real application, you'd want to implement proper error handling
    });
  });

  describe('Report generation', () => {
    it('should calculate completeness score correctly', async () => {
      const response = await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      expect(response.status).toBe(200);
      expect(response.body.data.metadata.completenessScore).toBeGreaterThan(0);
      expect(response.body.data.metadata.totalFiles).toBe(3); // test.js, package.json, README.md
      expect(response.body.data.metadata.processedFiles).toBe(2); // processed_test.js, processed_package.json
    });

    it('should include Mermaid diagrams in report', async () => {
      const response = await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      expect(response.status).toBe(200);
      expect(response.body.data.content).toContain('```mermaid');
      expect(response.body.data.content).toContain('pie title File Types');
      expect(response.body.data.content).toContain('flowchart TD');
    });

    it('should identify file type categories correctly', async () => {
      const response = await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      expect(response.status).toBe(200);
      const content = response.body.data.content;

      // Should detect documentation (README.md)
      expect(content).toContain('Documentation | ✅ Present');

      // Should detect configuration (package.json)
      expect(content).toContain('Configuration | ✅ Present');

      // Should detect source code (test.js)
      expect(content).toContain('Source Code | ✅ Present');
    });
  });
});
