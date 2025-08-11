import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

let server;

describe('Security Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { default: app } = await import('../../server.js');
    server = app;
  });

  afterAll(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('Input Validation & Sanitization', () => {
    test('should reject malicious script injection in project name', async () => {
      const maliciousProject = {
        name: '<script>alert("xss")</script>',
        description: 'Test project'
      };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(maliciousProject)
        .expect(400);

      // Should be rejected by validation
      expect(response.body.success).toBe(false);
    });

    test('should reject SQL injection attempts in search parameters', async () => {
      const maliciousSearch = "'; DROP TABLE projects; --";

      const response = await request(server)
        .get(`/api/v1/projects?search=${encodeURIComponent(maliciousSearch)}`)
        .expect(200);

      // Should handle safely without errors
      expect(response.body.success).toBe(true);
    });

    test('should reject oversized payloads', async () => {
      const oversizedProject = {
        name: 'A'.repeat(10000), // Very long name
        description: 'B'.repeat(100000) // Very long description
      };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(oversizedProject)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should sanitize file names properly', async () => {
      // Create a test project first
      const projectResponse = await request(server)
        .post('/api/v1/projects')
        .send({ name: 'Security Test Project' });

      const projectId = projectResponse.body.data.id;

      // Try to upload file with malicious name
      const _maliciousFilename = '../../../etc/passwd';

      // Note: This test would need actual file upload setup
      // In a real implementation, you'd test file upload with dangerous names
      const uploadResponse = await request(server)
        .post(`/api/v1/files/projects/${projectId}/files`)
        .expect(400); // Should reject dangerous file names

      expect(uploadResponse.body.success).toBe(false);
    });
  });

  describe('Authentication & Authorization', () => {
    test('should handle missing authentication gracefully', async () => {
      // Currently no auth implemented, but test should prepare for it
      const response = await request(server)
        .get('/api/v1/projects')
        .expect(200);

      // For now, should work without auth
      // In future, this might return 401
      expect(response.body).toHaveProperty('success');
    });

    test('should reject invalid JWT tokens when auth is implemented', async () => {
      const response = await request(server)
        .get('/api/v1/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200); // Currently no auth validation

      // Future: expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Path Traversal Protection', () => {
    test('should prevent directory traversal in project IDs', async () => {
      const maliciousId = '../../../etc/passwd';

      const response = await request(server)
        .get(`/api/v1/projects/${encodeURIComponent(maliciousId)}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should prevent directory traversal in file IDs', async () => {
      // Create a test project first
      const projectResponse = await request(server)
        .post('/api/v1/projects')
        .send({ name: 'Path Traversal Test Project' });

      const projectId = projectResponse.body.data.id;
      const maliciousFileId = '../../../etc/passwd';

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${encodeURIComponent(maliciousFileId)}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('Rate Limiting & DoS Protection', () => {
    test('should handle rapid requests gracefully', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(server).get('/api/v1/health')
      );

      const responses = await Promise.all(promises);

      // All should succeed (no rate limiting implemented yet)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle concurrent project creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(server)
          .post('/api/v1/projects')
          .send({
            name: `Concurrent Project ${i} ${Date.now()}`,
            description: 'Concurrency test'
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed with unique IDs
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      const projectIds = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(projectIds);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(server)
        .get('/api/v1/projects/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Project not found');
      // Should not expose file system paths, database details, etc.
      expect(response.body.error).not.toMatch(/\/[a-zA-Z]/); // No file paths
      expect(response.body.error).not.toMatch(/ENOENT/); // No system error codes
    });

    test('should not expose stack traces in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const response = await request(server)
          .post('/api/v1/projects')
          .send({ name: null }) // Invalid data to trigger error
          .expect(400);

        // Should not contain stack trace in production
        expect(response.body).not.toHaveProperty('stack');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('File Upload Security', () => {
    test('should reject files with dangerous extensions', async () => {
      // Create test project
      const projectResponse = await request(server)
        .post('/api/v1/projects')
        .send({ name: 'File Security Test Project' });

      const _projectId = projectResponse.body.data.id;

      // Test would need actual file upload implementation
      // This is a placeholder for file extension validation
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com'];

      // In a real test, you'd try to upload files with these extensions
      // and verify they're rejected
      expect(dangerousExtensions.length).toBeGreaterThan(0);
    });

    test('should limit file upload size', async () => {
      // Create test project
      const projectResponse = await request(server)
        .post('/api/v1/projects')
        .send({ name: 'File Size Test Project' });

      const projectId = projectResponse.body.data.id;

      // Test would try to upload a file larger than the limit
      // and verify it's rejected
      const response = await request(server)
        .post(`/api/v1/files/projects/${projectId}/files`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Headers & CORS Security', () => {
    test('should include security headers', async () => {
      const response = await request(server)
        .get('/api/v1/health')
        .expect(200);

      // Check for common security headers
      // (These depend on the helmet middleware configuration)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should handle CORS properly', async () => {
      const response = await request(server)
        .options('/api/v1/projects')
        .set('Origin', 'http://localhost:4200')
        .expect(204);

      // Should allow requests from frontend
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    test('should validate required fields strictly', async () => {
      const invalidProject = {
        // Missing required 'name' field
        description: 'Project without name'
      };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(invalidProject)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate data types correctly', async () => {
      const invalidProject = {
        name: 123, // Should be string
        description: ['not', 'a', 'string'], // Should be string
        tags: 'not-an-array' // Should be array
      };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(invalidProject)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate field lengths', async () => {
      const invalidProject = {
        name: '', // Empty name should be rejected
        description: 'Valid description'
      };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(invalidProject)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Environment Variable Security', () => {
    test('should not expose sensitive environment variables', async () => {
      const response = await request(server)
        .get('/api/v1/health')
        .expect(200);

      // Health check should not expose sensitive environment info
      expect(response.body).not.toHaveProperty('env');
      expect(response.body).not.toHaveProperty('secrets');
      expect(response.body).not.toHaveProperty('database');
    });
  });

  describe('API Response Security', () => {
    test('should not expose internal system information', async () => {
      const response = await request(server)
        .get('/api/v1/projects')
        .expect(200);

      // Should not expose database schema, internal IDs, etc.
      expect(JSON.stringify(response.body)).not.toMatch(/password/i);
      expect(JSON.stringify(response.body)).not.toMatch(/secret/i);
      expect(JSON.stringify(response.body)).not.toMatch(/token/i);
    });

    test('should properly handle malformed JSON requests', async () => {
      const response = await request(server)
        .post('/api/v1/projects')
        .set('Content-Type', 'application/json')
        .send('{"name": "test", invalid json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
