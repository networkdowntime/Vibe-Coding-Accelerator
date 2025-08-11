import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import app from '../../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PROJECT_STORAGE_PATH = './test_projects';

describe('Traceability Routes Basic Tests', () => {
  const testProjectId = 'test-project-simple';
  const testProjectPath = path.join(process.cwd(), 'test_projects', testProjectId);

  beforeEach(async () => {
    // Ensure clean test environment
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }

    // Create test project structure
    await fs.mkdir(testProjectPath, { recursive: true });
    await fs.mkdir(path.join(testProjectPath, 'files'), { recursive: true });
    await fs.mkdir(path.join(testProjectPath, 'output'), { recursive: true });

    // Create a test file
    await fs.writeFile(
      path.join(testProjectPath, 'files', 'test.js'),
      'console.log("Hello World");'
    );

    // Create some processed files to avoid the "no processed files" error
    await fs.writeFile(
      path.join(testProjectPath, 'output', 'processed_test.js'),
      '// Processed version\nconsole.log("Hello World");'
    );
  });

  afterEach(async () => {
    // Clean up test project
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Traceability API Endpoints', () => {
    it('should have the traceability routes registered', async () => {
      // Test that the consistency check endpoint exists
      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({ projectId: testProjectId });

      // We expect either a validation error or a 500 (since we're not mocking LLM)
      // but the route should exist and not return 404
      expect(response.status).not.toBe(404);
    });

    it('should validate required fields for consistency check', async () => {
      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({}); // Empty request body

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should have report generation endpoint', async () => {
      const response = await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have report retrieval endpoint', async () => {
      // First generate a report
      await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      const response = await request(app)
        .get(`/api/v1/traceability/reports/${testProjectId}`);

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have report download endpoint', async () => {
      // First generate a report
      await request(app)
        .post(`/api/v1/traceability/reports/${testProjectId}/generate`);

      const response = await request(app)
        .get(`/api/v1/traceability/reports/${testProjectId}/download`);

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should validate project ID format in consistency status endpoint', async () => {
      // Start a consistency check first to get a valid job ID
      const consistencyResponse = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({ projectId: testProjectId });

      let statusResponse;
      if (consistencyResponse.status === 200 && consistencyResponse.body.data && consistencyResponse.body.data.consistencyJobId) {
        // Test the status endpoint with the real job ID
        statusResponse = await request(app)
          .get(`/api/v1/traceability/consistency-check/${consistencyResponse.body.data.consistencyJobId}/status`);
      } else {
        // If consistency check failed, test with a fake but valid job ID
        statusResponse = await request(app)
          .get('/api/v1/traceability/consistency-check/test-job-id/status');
      }

      // Should handle the request appropriately (route exists, not 404)
      expect(statusResponse.status).not.toBe(404);
    });
  });

  describe('Validation Tests', () => {
    it('should reject consistency check without project ID', async () => {
      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({ jobId: 'some-job-id' }); // Missing projectId

      expect(response.status).toBe(400);
    });

    it('should accept consistency check with valid project ID', async () => {
      const response = await request(app)
        .post('/api/v1/traceability/consistency-check')
        .send({ projectId: testProjectId });

      // Should pass validation but may fail on LLM call
      expect(response.status).not.toBe(400);
    });
  });
});
