const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const agentRoutes = require('../../routes/agentRoutes');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/projects', agentRoutes); // Tech stack routes are under projects
app.use('/api', agentRoutes); // Agent listing routes

describe('Agent Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/agents', () => {
    it('should return empty array when ai_agents directory does not exist', async () => {
      fs.access.mockRejectedValue(new Error('Directory not found'));

      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toEqual({ agents: [] });
    });

    it('should return list of agents from ai_agents directory', async () => {
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        { name: 'githubCopilot', isDirectory: () => true },
        { name: 'chatGpt', isDirectory: () => true },
        { name: '.gitkeep', isDirectory: () => false },
        { name: 'claude', isDirectory: () => true }
      ]);

      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toEqual({
        agents: [
          { id: 'githubCopilot', name: 'Github Copilot' },
          { id: 'chatGpt', name: 'Chat Gpt' },
          { id: 'claude', name: 'Claude' }
        ]
      });
    });

    it('should handle errors when reading directory', async () => {
      fs.access.mockResolvedValue();
      fs.readdir.mockRejectedValue(new Error('Read error'));

      const response = await request(app)
        .get('/api/agents')
        .expect(500);

      expect(response.body.error).toBe('Failed to load AI agents');
    });
  });

  describe('GET /api/agents/:agentName/tech-stacks', () => {
    it('should return empty array when instructions directory does not exist', async () => {
      fs.access.mockRejectedValue(new Error('Directory not found'));

      const response = await request(app)
        .get('/api/agents/githubCopilot/tech-stacks')
        .expect(200);

      expect(response.body).toEqual({ techStacks: [] });
    });

    it('should return tech stacks from instructions directory', async () => {
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue([
        'tech-javascript.instructions.md',
        'tech-typescript.instructions.md',
        'tech-angular.instructions.md',
        'readme.md', // Should be filtered out
        'tech-nodejs.instructions.md'
      ]);

      const response = await request(app)
        .get('/api/agents/githubCopilot/tech-stacks')
        .expect(200);

      expect(response.body).toEqual({
        techStacks: [
          { 
            id: 'tech-javascript.instructions.md', 
            name: 'javascript', 
            displayName: 'javascript',
            type: 'tech',
            typeDisplayName: 'Technology'
          },
          { 
            id: 'tech-typescript.instructions.md', 
            name: 'typescript', 
            displayName: 'typescript',
            type: 'tech',
            typeDisplayName: 'Technology'
          },
          { 
            id: 'tech-angular.instructions.md', 
            name: 'angular', 
            displayName: 'angular',
            type: 'tech',
            typeDisplayName: 'Technology'
          },
          { 
            id: 'tech-nodejs.instructions.md', 
            name: 'nodejs', 
            displayName: 'nodejs',
            type: 'tech',
            typeDisplayName: 'Technology'
          }
        ]
      });
    });

    it('should handle errors when reading instructions directory', async () => {
      fs.access.mockResolvedValue();
      fs.readdir.mockRejectedValue(new Error('Read error'));

      const response = await request(app)
        .get('/api/agents/githubCopilot/tech-stacks')
        .expect(500);

      expect(response.body.error).toBe('Failed to load tech stacks');
    });
  });

  describe('POST /api/projects/:projectName/tech-stack', () => {
    it('should save tech stack to project directory', async () => {
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const techStack = ['javascript', 'typescript', 'angular'];

      const response = await request(app)
        .post('/api/projects/myProject/tech-stack')
        .send({ techStack })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Project configuration saved successfully',
        techStack,
        aiAgent: undefined
      });

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('projects/myProject'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('project-config.json'),
        expect.stringContaining('"tech-stack": [\n    "javascript",\n    "typescript",\n    "angular"\n  ]'),
        'utf8'
      );
    });

    it('should return error for invalid tech stack format', async () => {
      const response = await request(app)
        .post('/api/projects/myProject/tech-stack')
        .send({ techStack: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toBe('Tech stack must be an array');
    });

    it('should handle file system errors', async () => {
      fs.mkdir.mockRejectedValue(new Error('Write error'));

      const response = await request(app)
        .post('/api/projects/myProject/tech-stack')
        .send({ techStack: ['javascript'] })
        .expect(500);

      expect(response.body.error).toBe('Failed to save project configuration');
    });
  });

  describe('GET /api/projects/:projectName/tech-stack', () => {
    it('should return tech stack from project file', async () => {
      fs.readFile.mockResolvedValue('javascript\ntypescript\nangular\n');

      const response = await request(app)
        .get('/api/projects/myProject/tech-stack')
        .expect(200);

      expect(response.body).toEqual({
        techStack: ['javascript', 'typescript', 'angular'],
        aiAgent: null
      });
    });

    it('should return empty array when file does not exist', async () => {
      const notFoundError = new Error('File not found');
      notFoundError.code = 'ENOENT';
      fs.readFile.mockRejectedValue(notFoundError);

      const response = await request(app)
        .get('/api/projects/myProject/tech-stack')
        .expect(200);

      expect(response.body).toEqual({ 
        techStack: [],
        aiAgent: null 
      });
    });

    it('should handle empty lines in tech stack file', async () => {
      fs.readFile.mockResolvedValue('javascript\n\ntypescript\n\nangular\n\n');

      const response = await request(app)
        .get('/api/projects/myProject/tech-stack')
        .expect(200);

      expect(response.body).toEqual({
        techStack: ['javascript', 'typescript', 'angular'],
        aiAgent: null
      });
    });

    it('should handle file system errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Read error'));

      const response = await request(app)
        .get('/api/projects/myProject/tech-stack')
        .expect(500);

      expect(response.body.error).toBe('Failed to load project configuration');
    });
  });
});
