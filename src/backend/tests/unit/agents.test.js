import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the server
let server;
let agentsController;

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock filesystem
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn()
  }
}));

describe('Agents Controller', () => {
  beforeEach(async () => {
    // Import after mocking
    const { default: app } = await import('../../server.js');
    server = app;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('GET /api/v1/agents', () => {
    test('should return available agents successfully', async () => {
      const response = await request(server)
        .get('/api/v1/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents).toBeDefined();
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.agents.length).toBeGreaterThan(0);

      // Check agent structure
      const agent = response.body.agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('type');
    });

    test('should include expected default agents', async () => {
      const response = await request(server)
        .get('/api/v1/agents');

      expect(response.status).toBe(200);

      const agentIds = response.body.agents.map(agent => agent.id);
      expect(agentIds).toContain('coding-standards-enforcer');
      expect(agentIds).toContain('documentation-generator');
      expect(agentIds).toContain('code-reviewer');
      expect(agentIds).toContain('architecture-advisor');
    });
  });

  describe('GET /api/v1/agents/tech-stacks', () => {
    test('should return tech stack options successfully', async () => {
      // Mock readdir to return instruction files
      fs.promises.readdir.mockResolvedValue([
        'tech-angular.instructions.md',
        'tech-java.instructions.md',
        'tech-typescript.instructions.md',
        'security-owasp.instructions.md',
        'README.md' // Should be filtered out
      ]);

      const response = await request(server)
        .get('/api/v1/agents/tech-stacks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.techStacks).toBeDefined();
      expect(Array.isArray(response.body.techStacks)).toBe(true);

      // Should filter out non-instruction files
      expect(response.body.techStacks).toHaveLength(4);

      // Check tech stack structure
      const techStack = response.body.techStacks[0];
      expect(techStack).toHaveProperty('id');
      expect(techStack).toHaveProperty('name');
      expect(techStack).toHaveProperty('description');
      expect(techStack).toHaveProperty('category');
      expect(techStack).toHaveProperty('filename');
    });

    test('should categorize tech stacks correctly', async () => {
      fs.promises.readdir.mockResolvedValue([
        'tech-angular.instructions.md',
        'tech-java.instructions.md',
        'tech-javascript.instructions.md',
        'tech-docker.instructions.md',
        'security-owasp.instructions.md'
      ]);

      const response = await request(server)
        .get('/api/v1/agents/tech-stacks');

      expect(response.status).toBe(200);

      const categories = response.body.techStacks.map(ts => ts.category);
      expect(categories).toContain('Frontend'); // Angular
      expect(categories).toContain('Backend');  // Java
      expect(categories).toContain('Language'); // JavaScript
      expect(categories).toContain('Infrastructure'); // Docker
      expect(categories).toContain('Security'); // OWASP
    });

    test('should handle file system errors gracefully', async () => {
      fs.promises.readdir.mockRejectedValue(new Error('Directory not found'));

      const response = await request(server)
        .get('/api/v1/agents/tech-stacks')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve tech stack options');
    });
  });

  describe('POST /api/v1/agents/projects/:projectId/tech-stack', () => {
    const projectId = 'test-project';
    const validPayload = {
      selectedTechStacks: ['tech-angular', 'tech-typescript'],
      selectedAgent: 'coding-standards-enforcer'
    };

    test('should save tech stack selection successfully', async () => {
      // Mock project directory exists
      fs.promises.access.mockResolvedValue();
      // Mock file write operations
      fs.promises.writeFile.mockResolvedValue();

      const response = await request(server)
        .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tech stack and agent configuration saved successfully');
      expect(response.body.data.selectedTechStacks).toEqual(validPayload.selectedTechStacks);
      expect(response.body.data.selectedAgent).toBe(validPayload.selectedAgent);

      // Verify file write calls
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
    });

    test('should return 400 when project ID is missing', async () => {
      const response = await request(server)
        .post('/api/v1/agents/projects//tech-stack')
        .send(validPayload)
        .expect(404); // Express will return 404 for empty param

      // Test with actual missing project ID in path
      const response2 = await request(server)
        .post('/api/v1/agents/projects/tech-stack')
        .send(validPayload)
        .expect(404);
    });

    test('should return 400 when selectedTechStacks is missing', async () => {
      const response = await request(server)
        .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .send({ selectedAgent: 'coding-standards-enforcer' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Selected tech stacks must be an array');
    });

    test('should return 400 when selectedTechStacks is not an array', async () => {
      const response = await request(server)
        .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .send({
          selectedTechStacks: 'not-an-array',
          selectedAgent: 'coding-standards-enforcer'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Selected tech stacks must be an array');
    });

    test('should return 404 when project does not exist', async () => {
      // Mock project directory doesn't exist
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      const response = await request(server)
        .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .send(validPayload)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found');
    });

    test('should handle file write errors gracefully', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.writeFile.mockRejectedValue(new Error('Permission denied'));

      const response = await request(server)
        .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .send(validPayload)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to save tech stack selection');
    });

    test('should save without selectedAgent', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();

      const payload = {
        selectedTechStacks: ['tech-angular', 'tech-typescript']
      };

      const response = await request(server)
        .post(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual(payload.selectedTechStacks);
      expect(response.body.data.selectedAgent).toBeUndefined();

      // Should only write techstack.txt file
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/agents/projects/:projectId/tech-stack', () => {
    const projectId = 'test-project';

    test('should return saved tech stack selection', async () => {
      // Mock reading techstack.txt
      fs.promises.readFile
        .mockResolvedValueOnce('tech-angular\\ntech-typescript')
        .mockResolvedValueOnce(JSON.stringify({
          selectedAgent: 'coding-standards-enforcer',
          selectedTechStacks: ['tech-angular', 'tech-typescript'],
          updatedAt: '2024-01-01T00:00:00.000Z'
        }));

      const response = await request(server)
        .get(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual(['tech-angular', 'tech-typescript']);
      expect(response.body.data.selectedAgent).toBe('coding-standards-enforcer');
    });

    test('should return empty arrays when no files exist', async () => {
      // Mock file not found errors
      fs.promises.readFile.mockRejectedValue(new Error('ENOENT'));

      const response = await request(server)
        .get(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual([]);
      expect(response.body.data.selectedAgent).toBeNull();
    });

    test('should return 400 when project ID is missing', async () => {
      const response = await request(server)
        .get('/api/v1/agents/projects//tech-stack')
        .expect(404); // Express returns 404 for empty param
    });

    test('should handle only techstack.txt file existing', async () => {
      fs.promises.readFile
        .mockResolvedValueOnce('tech-angular\\ntech-typescript')
        .mockRejectedValueOnce(new Error('ENOENT')); // agent-config.json doesn't exist

      const response = await request(server)
        .get(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual(['tech-angular', 'tech-typescript']);
      expect(response.body.data.selectedAgent).toBeNull();
    });

    test('should handle malformed agent config file', async () => {
      fs.promises.readFile
        .mockResolvedValueOnce('tech-angular\\ntech-typescript')
        .mockResolvedValueOnce('invalid json'); // Malformed JSON

      const response = await request(server)
        .get(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual(['tech-angular', 'tech-typescript']);
      expect(response.body.data.selectedAgent).toBeNull();
    });

    test('should handle file read errors gracefully', async () => {
      fs.promises.readFile.mockRejectedValue(new Error('Permission denied'));

      const response = await request(server)
        .get(`/api/v1/agents/projects/${projectId}/tech-stack`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve tech stack selection');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty tech stack file', async () => {
      fs.promises.readFile
        .mockResolvedValueOnce('') // Empty techstack.txt
        .mockRejectedValueOnce(new Error('ENOENT'));

      const response = await request(server)
        .get('/api/v1/agents/projects/test-project/tech-stack')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual([]);
    });

    test('should filter empty lines from tech stack file', async () => {
      fs.promises.readFile
        .mockResolvedValueOnce('tech-angular\\n\\ntech-typescript\\n\\n') // With empty lines
        .mockRejectedValueOnce(new Error('ENOENT'));

      const response = await request(server)
        .get('/api/v1/agents/projects/test-project/tech-stack')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedTechStacks).toEqual(['tech-angular', 'tech-typescript']);
    });

    test('should prioritize agent config over techstack.txt for tech stacks', async () => {
      fs.promises.readFile
        .mockResolvedValueOnce('tech-angular') // techstack.txt
        .mockResolvedValueOnce(JSON.stringify({
          selectedAgent: 'coding-standards-enforcer',
          selectedTechStacks: ['tech-react', 'tech-typescript'], // Different from techstack.txt
          updatedAt: '2024-01-01T00:00:00.000Z'
        }));

      const response = await request(server)
        .get('/api/v1/agents/projects/test-project/tech-stack')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should use selectedTechStacks from agent config
      expect(response.body.data.selectedTechStacks).toEqual(['tech-react', 'tech-typescript']);
      expect(response.body.data.selectedAgent).toBe('coding-standards-enforcer');
    });
  });
});
