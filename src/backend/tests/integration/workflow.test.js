import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
const TEST_PROJECTS_DIR = path.join(__dirname, '../../test_projects_integration');

describe('Integration Tests - Project Workflow', () => {
  let projectId;

  beforeAll(async () => {
    // Set test environment
    process.env.PROJECT_STORAGE_PATH = TEST_PROJECTS_DIR;
    process.env.NODE_ENV = 'test';

    // Import server after setting environment
    const { default: app } = await import('../../server.js');
    server = app;

    // Clean up test directory
    try {
      await fs.rm(TEST_PROJECTS_DIR, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(TEST_PROJECTS_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    if (server && server.close) {
      server.close();
    }
  });

  beforeEach(() => {
    projectId = null;
  });

  test('Complete project workflow - Create, Upload, Process, Download', async () => {
    // Step 1: Create a new project
    const projectData = {
      name: 'Integration Test Project',
      description: 'A project for testing the complete workflow',
      tags: ['integration', 'test']
    };

    const createResponse = await request(server)
      .post('/api/v1/projects')
      .send(projectData)
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    projectId = createResponse.body.data.id;
    expect(projectId).toBeDefined();

    // Step 2: Upload files to the project
    const testFileContent = `
# Integration Test File

This is a test file for integration testing.

## Features
- Project creation
- File upload
- LLM processing
- Report generation

\`\`\`javascript
function testFunction() {
  console.log('Testing integration');
  return true;
}
\`\`\`
`;

    // Create a temporary test file
    const tempFilePath = path.join(__dirname, 'temp_test_file.md');
    await fs.writeFile(tempFilePath, testFileContent);

    const uploadResponse = await request(server)
      .post(`/api/v1/files/projects/${projectId}/files`)
      .attach('files', tempFilePath)
      .field('description', 'Integration test file')
      .expect(201);

    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.data).toHaveLength(1);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    // Step 3: Configure AI agent and tech stack
    const agentConfig = {
      selectedTechStacks: ['tech-javascript', 'tech-documentation'],
      selectedAgent: 'documentation-generator'
    };

    const configResponse = await request(server)
      .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
      .send(agentConfig)
      .expect(200);

    expect(configResponse.body.success).toBe(true);

    // Step 4: Start LLM processing
    const llmProcessData = {
      projectId,
      fileIds: ['temp_test_file.md'],
      aiAgentConfig: {
        model: 'test-model',
        prompt: 'Analyze this code for best practices'
      }
    };

    const processResponse = await request(server)
      .post('/api/v1/llm/process')
      .send(llmProcessData)
      .expect(200);

    expect(processResponse.body.success).toBe(true);
    const jobId = processResponse.body.data.jobId;

    // Step 5: Check processing status
    const statusResponse = await request(server)
      .get(`/api/v1/llm/status/${jobId}`)
      .expect(200);

    expect(statusResponse.body.success).toBe(true);
    expect(statusResponse.body.data.status).toBeDefined();

    // Step 6: Generate traceability report
    const reportResponse = await request(server)
      .post(`/api/v1/traceability/reports/${projectId}/generate`)
      .expect(200);

    expect(reportResponse.body.success).toBe(true);

    // Step 7: Retrieve generated report
    const getReportResponse = await request(server)
      .get(`/api/v1/traceability/reports/${projectId}`)
      .expect(200);

    expect(getReportResponse.body.success).toBe(true);
    expect(getReportResponse.body.data.content).toContain('# Traceability Report');

    // Step 8: Download report
    const downloadResponse = await request(server)
      .get(`/api/v1/traceability/reports/${projectId}/download`)
      .expect(200);

    expect(downloadResponse.headers['content-disposition']).toMatch(/attachment/);

    // Step 9: Update project status
    const updateResponse = await request(server)
      .put(`/api/v1/projects/${projectId}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.status).toBe('completed');

    // Step 10: Verify project appears in projects list
    const listResponse = await request(server)
      .get('/api/v1/projects')
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    const createdProject = listResponse.body.data.find(p => p.id === projectId);
    expect(createdProject).toBeDefined();
    expect(createdProject.status).toBe('completed');
  });

  test('Error handling workflow - Invalid operations', async () => {
    // Test operations on non-existent project
    const nonExistentId = 'non-existent-project-id';

    // Try to upload to non-existent project
    const uploadResponse = await request(server)
      .post(`/api/v1/files/projects/${nonExistentId}/files`)
      .expect(404);

    expect(uploadResponse.body.success).toBe(false);

    // Try to configure non-existent project
    const configResponse = await request(server)
      .post(`/api/v1/agents/projects/${nonExistentId}/tech-stack`)
      .send({ selectedTechStacks: [] })
      .expect(404);

    expect(configResponse.body.success).toBe(false);

    // Try to process non-existent project
    const processResponse = await request(server)
      .post('/api/v1/llm/process')
      .send({
        projectId: nonExistentId,
        fileIds: ['test.txt'],
        aiAgentConfig: { model: 'test' }
      })
      .expect(400);

    expect(processResponse.body.success).toBe(false);
  });

  test('Concurrent operations workflow', async () => {
    // Create multiple projects concurrently
    const projectPromises = Array.from({ length: 3 }, (_, i) =>
      request(server)
        .post('/api/v1/projects')
        .send({
          name: `Concurrent Project ${i + 1}`,
          description: `Test project ${i + 1}`,
          tags: ['concurrent', 'test']
        })
    );

    const responses = await Promise.all(projectPromises);

    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    // All should have unique IDs
    const projectIds = responses.map(r => r.body.data.id);
    const uniqueIds = new Set(projectIds);
    expect(uniqueIds.size).toBe(3);

    // Clean up created projects
    const deletePromises = projectIds.map(id =>
      request(server).delete(`/api/v1/projects/${id}`)
    );

    await Promise.all(deletePromises);
  });

  test('File operations workflow', async () => {
    // Create project first
    const createResponse = await request(server)
      .post('/api/v1/projects')
      .send({
        name: 'File Operations Test Project',
        description: 'Testing file operations'
      })
      .expect(201);

    projectId = createResponse.body.data.id;

    // Test empty file list
    const emptyListResponse = await request(server)
      .get(`/api/v1/files/projects/${projectId}/files`)
      .expect(200);

    expect(emptyListResponse.body.data).toEqual([]);

    // Create multiple test files
    const testFiles = [
      { name: 'test1.js', content: 'console.log("Test 1");' },
      { name: 'test2.md', content: '# Test File 2' },
      { name: 'test3.json', content: '{"test": true}' }
    ];

    for (const file of testFiles) {
      const tempPath = path.join(__dirname, file.name);
      await fs.writeFile(tempPath, file.content);

      const uploadResponse = await request(server)
        .post(`/api/v1/files/projects/${projectId}/files`)
        .attach('files', tempPath)
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      await fs.unlink(tempPath);
    }

    // Verify files are listed
    const listResponse = await request(server)
      .get(`/api/v1/files/projects/${projectId}/files`)
      .expect(200);

    expect(listResponse.body.data).toHaveLength(3);

    // Test file content retrieval
    const fileId = listResponse.body.data[0].id;
    const contentResponse = await request(server)
      .get(`/api/v1/files/projects/${projectId}/files/${fileId}/content`)
      .expect(200);

    expect(contentResponse.body.success).toBe(true);
    expect(contentResponse.body.data.content).toBeDefined();

    // Test file deletion
    const deleteResponse = await request(server)
      .delete(`/api/v1/files/projects/${projectId}/files/${fileId}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);

    // Verify file is removed from list
    const updatedListResponse = await request(server)
      .get(`/api/v1/files/projects/${projectId}/files`)
      .expect(200);

    expect(updatedListResponse.body.data).toHaveLength(2);
  });

  test('Settings and configuration workflow', async () => {
    // Get default settings
    const defaultSettingsResponse = await request(server)
      .get('/api/v1/settings')
      .expect(200);

    expect(defaultSettingsResponse.body.success).toBe(true);
    expect(defaultSettingsResponse.body.data).toHaveProperty('llmApiUrl');

    // Update settings
    const newSettings = {
      llmApiUrl: 'https://test.example.com/api',
      llmApiKey: 'test-api-key',
      llmModel: 'test-model-v1'
    };

    const updateSettingsResponse = await request(server)
      .put('/api/v1/settings')
      .send(newSettings)
      .expect(200);

    expect(updateSettingsResponse.body.success).toBe(true);

    // Verify settings were updated
    const updatedSettingsResponse = await request(server)
      .get('/api/v1/settings')
      .expect(200);

    expect(updatedSettingsResponse.body.data.llmApiUrl).toBe(newSettings.llmApiUrl);

    // Test LLM connection with mock
    const testConnectionResponse = await request(server)
      .post('/api/v1/settings/test-llm')
      .send({
        llmApiUrl: 'https://mock.example.com',
        llmApiKey: 'mock-key'
      })
      .expect(200);

    // Should handle connection test (will fail but should be graceful)
    expect(testConnectionResponse.body).toHaveProperty('success');
  });

  test('Health check and monitoring', async () => {
    // Test health endpoint
    const healthResponse = await request(server)
      .get('/api/v1/health')
      .expect(200);

    expect(healthResponse.body).toHaveProperty('status');
    expect(healthResponse.body).toHaveProperty('timestamp');
    expect(healthResponse.body).toHaveProperty('uptime');

    // Test invalid endpoints return proper errors
    const invalidResponse = await request(server)
      .get('/api/v1/invalid-endpoint')
      .expect(404);

    expect(invalidResponse.body).toHaveProperty('success');
    expect(invalidResponse.body.success).toBe(false);
  });
});
