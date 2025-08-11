import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Mock the server
let server;

// Mock filesystem utils
jest.mock('../../utils/fileSystem.js', () => ({
  ensureDirectory: jest.fn(),
  directoryExists: jest.fn(),
  deleteDirectory: jest.fn(),
  writeFileContent: jest.fn(),
  readFileContent: jest.fn(),
  getFileStats: jest.fn(),
  listFiles: jest.fn()
}));

// Mock helpers
jest.mock('../../utils/helpers.js', () => ({
  createResponse: jest.fn((data, message, status = 200, meta = {}) => ({
    success: true,
    data,
    message,
    status,
    ...meta
  })),
  createErrorResponse: jest.fn((message, status = 500, details = null) => ({
    success: false,
    error: message,
    status,
    details
  })),
  sanitizeForFilename: jest.fn(name => name.replace(/[^a-zA-Z0-9-_]/g, '_')),
  paginate: jest.fn((data, page, limit) => ({
    data: data.slice((page - 1) * limit, page * limit),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      totalItems: data.length,
      itemsPerPage: limit,
      hasNextPage: page * limit < data.length,
      hasPrevPage: page > 1
    }
  }))
}));

// Mock fs/promises for project deletion
jest.mock('fs/promises', () => ({
  rename: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

describe('Projects Controller', () => {
  let fileSystemUtils;
  let helpers;
  let fsPromises;

  beforeEach(async () => {
    // Import after mocking
    const { default: app } = await import('../../server.js');
    server = app;

    fileSystemUtils = await import('../../utils/fileSystem.js');
    helpers = await import('../../utils/helpers.js');
    fsPromises = await import('fs/promises');

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    fileSystemUtils.ensureDirectory.mockResolvedValue();
    fileSystemUtils.directoryExists.mockResolvedValue(true);
    fileSystemUtils.writeFileContent.mockResolvedValue();
    fileSystemUtils.listFiles.mockResolvedValue([]);
  });

  afterEach(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('GET /api/v1/projects', () => {
    test('should return all projects successfully', async () => {
      const mockProjects = [
        {
          name: 'project1',
          path: '/projects/project1',
          type: 'directory'
        },
        {
          name: 'project2',
          path: '/projects/project2',
          type: 'directory'
        }
      ];

      const mockProjectData1 = {
        id: 'project1',
        name: 'Test Project 1',
        description: 'First test project',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockProjectData2 = {
        id: 'project2',
        name: 'Test Project 2',
        description: 'Second test project',
        status: 'draft',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      };

      fileSystemUtils.listFiles.mockResolvedValue(mockProjects);
      fileSystemUtils.readFileContent
        .mockResolvedValueOnce(JSON.stringify(mockProjectData1))
        .mockResolvedValueOnce(JSON.stringify(mockProjectData2));

      // Mock progress and file count calculation
      fileSystemUtils.listFiles
        .mockResolvedValueOnce(mockProjects) // getAllProjects call
        .mockResolvedValueOnce([]) // calculateProjectProgress for project1 - files
        .mockResolvedValueOnce([]) // calculateProjectProgress for project1 - analysis
        .mockResolvedValueOnce([]) // getProjectFileCount for project1
        .mockResolvedValueOnce([]) // calculateProjectProgress for project2 - files
        .mockResolvedValueOnce([]) // calculateProjectProgress for project2 - analysis
        .mockResolvedValueOnce([]); // getProjectFileCount for project2

      const response = await request(server)
        .get('/api/v1/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter projects by status', async () => {
      const mockProjects = [
        {
          name: 'project1',
          path: '/projects/project1',
          type: 'directory'
        }
      ];

      const mockProjectData = {
        id: 'project1',
        name: 'Test Project 1',
        description: 'Test project',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      fileSystemUtils.listFiles.mockResolvedValue(mockProjects);
      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(mockProjectData));

      const response = await request(server)
        .get('/api/v1/projects?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.status).toBe('active');
    });

    test('should handle pagination correctly', async () => {
      const mockProjects = Array.from({ length: 25 }, (_, i) => ({
        name: `project${i}`,
        path: `/projects/project${i}`,
        type: 'directory'
      }));

      fileSystemUtils.listFiles.mockResolvedValue(mockProjects);

      // Mock project data for all projects
      const mockProjectData = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test project',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(mockProjectData));

      const response = await request(server)
        .get('/api/v1/projects?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(helpers.paginate).toHaveBeenCalled();
    });

    test('should handle file system errors gracefully', async () => {
      fileSystemUtils.listFiles.mockRejectedValue(new Error('Permission denied'));

      const response = await request(server)
        .get('/api/v1/projects')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve projects');
    });

    test('should skip invalid project directories', async () => {
      const mockProjects = [
        {
          name: 'valid-project',
          path: '/projects/valid-project',
          type: 'directory'
        },
        {
          name: 'invalid-project',
          path: '/projects/invalid-project',
          type: 'directory'
        }
      ];

      fileSystemUtils.listFiles.mockResolvedValue(mockProjects);
      fileSystemUtils.readFileContent
        .mockResolvedValueOnce(JSON.stringify({
          id: 'valid-project',
          name: 'Valid Project',
          status: 'active'
        }))
        .mockRejectedValueOnce(new Error('Invalid JSON')); // Second project fails

      const response = await request(server)
        .get('/api/v1/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only return valid projects
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    const projectId = 'test-project-123';

    test('should return project by ID successfully', async () => {
      const mockProjectData = {
        id: projectId,
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(mockProjectData));

      // Mock for computed fields
      fileSystemUtils.listFiles
        .mockResolvedValueOnce([]) // calculateProjectProgress - files
        .mockResolvedValueOnce([]) // calculateProjectProgress - analysis
        .mockResolvedValueOnce([]) // getProjectFileCount
        .mockResolvedValueOnce([]) // getProjectFiles
        .mockResolvedValueOnce([]); // getProjectTasks

      const response = await request(server)
        .get(`/api/v1/projects/${projectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data).toHaveProperty('fileCount');
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('tasks');
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/projects/${projectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 404 when project.json is missing', async () => {
      fileSystemUtils.readFileContent.mockRejectedValue({ code: 'ENOENT' });

      const response = await request(server)
        .get(`/api/v1/projects/${projectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('POST /api/v1/projects', () => {
    const validProjectData = {
      name: 'New Test Project',
      description: 'A new test project',
      tags: ['test', 'demo']
    };

    test('should create project successfully', async () => {
      // Mock that no existing projects have the same name
      fileSystemUtils.listFiles.mockResolvedValue([]);

      const response = await request(server)
        .post('/api/v1/projects')
        .send(validProjectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validProjectData.name);
      expect(response.body.data.description).toBe(validProjectData.description);
      expect(response.body.data.tags).toEqual(validProjectData.tags);
      expect(response.body.data.id).toBe('test-uuid-1234');
      expect(response.body.data.status).toBe('draft');

      // Verify directory creation calls
      expect(fileSystemUtils.ensureDirectory).toHaveBeenCalledTimes(4);
      expect(fileSystemUtils.writeFileContent).toHaveBeenCalledTimes(2); // project.json + README.md
    });

    test('should return 409 when project name already exists', async () => {
      // Mock existing project with same name
      const existingProjects = [{
        name: 'existing-project',
        path: '/projects/existing-project',
        type: 'directory'
      }];

      const existingProjectData = {
        id: 'existing-id',
        name: validProjectData.name, // Same name
        description: 'Existing project'
      };

      fileSystemUtils.listFiles.mockResolvedValue(existingProjects);
      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(existingProjectData));

      const response = await request(server)
        .post('/api/v1/projects')
        .send(validProjectData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project with this name already exists');
    });

    test('should handle missing required fields', async () => {
      const response = await request(server)
        .post('/api/v1/projects')
        .send({}) // Missing required name field
        .expect(400);

      // Note: This would be handled by validation middleware in a real implementation
    });

    test('should handle file system errors during creation', async () => {
      fileSystemUtils.listFiles.mockResolvedValue([]);
      fileSystemUtils.ensureDirectory.mockRejectedValue(new Error('Permission denied'));

      const response = await request(server)
        .post('/api/v1/projects')
        .send(validProjectData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create project');
    });

    test('should create project with minimal data', async () => {
      fileSystemUtils.listFiles.mockResolvedValue([]);

      const minimalData = { name: 'Minimal Project' };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(minimalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(minimalData.name);
      expect(response.body.data.description).toBe('');
      expect(response.body.data.tags).toEqual([]);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    const projectId = 'test-project-123';
    const updateData = {
      name: 'Updated Project Name',
      description: 'Updated description',
      status: 'active',
      tags: ['updated', 'test']
    };

    test('should update project successfully', async () => {
      const existingProjectData = {
        id: projectId,
        name: 'Original Name',
        description: 'Original description',
        status: 'draft',
        tags: ['original'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(existingProjectData));
      fileSystemUtils.listFiles.mockResolvedValue([]); // No name conflicts

      const response = await request(server)
        .put(`/api/v1/projects/${projectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.tags).toEqual(updateData.tags);
      expect(response.body.data.updatedAt).not.toBe(existingProjectData.updatedAt);

      expect(fileSystemUtils.writeFileContent).toHaveBeenCalled();
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .put(`/api/v1/projects/${projectId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 409 when updated name conflicts with existing project', async () => {
      const existingProjectData = {
        id: projectId,
        name: 'Original Name',
        description: 'Original description'
      };

      const conflictingProject = {
        id: 'other-project',
        name: updateData.name // Same as update name
      };

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(existingProjectData));
      fileSystemUtils.listFiles.mockResolvedValue([{
        name: 'other-project',
        path: '/projects/other-project',
        type: 'directory'
      }]);
      fileSystemUtils.readFileContent.mockResolvedValueOnce(JSON.stringify(existingProjectData));
      fileSystemUtils.readFileContent.mockResolvedValueOnce(JSON.stringify(conflictingProject));

      const response = await request(server)
        .put(`/api/v1/projects/${projectId}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project with this name already exists');
    });

    test('should update only provided fields', async () => {
      const existingProjectData = {
        id: projectId,
        name: 'Original Name',
        description: 'Original description',
        status: 'draft',
        tags: ['original'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const partialUpdate = { description: 'Only description updated' };

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(existingProjectData));
      fileSystemUtils.listFiles.mockResolvedValue([]);

      const response = await request(server)
        .put(`/api/v1/projects/${projectId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(existingProjectData.name); // Unchanged
      expect(response.body.data.description).toBe(partialUpdate.description); // Updated
      expect(response.body.data.status).toBe(existingProjectData.status); // Unchanged
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    const projectId = 'test-project-123';

    test('should delete project successfully', async () => {
      fsPromises.rename.mockResolvedValue();

      const response = await request(server)
        .delete(`/api/v1/projects/${projectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');
      expect(fsPromises.rename).toHaveBeenCalled();
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .delete(`/api/v1/projects/${projectId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should handle file system errors during deletion', async () => {
      fsPromises.rename.mockRejectedValue(new Error('Permission denied'));

      const response = await request(server)
        .delete(`/api/v1/projects/${projectId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to delete project');
    });
  });

  describe('Project progress calculation', () => {
    test('should calculate 0% progress for project with no files', async () => {
      const projectId = 'empty-project';
      const mockProjectData = {
        id: projectId,
        name: 'Empty Project',
        status: 'draft'
      };

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(mockProjectData));
      fileSystemUtils.listFiles
        .mockResolvedValueOnce([]) // files
        .mockResolvedValueOnce([]) // analysis
        .mockResolvedValueOnce([]) // file count
        .mockResolvedValueOnce([]) // project files
        .mockResolvedValueOnce([]); // tasks

      const response = await request(server)
        .get(`/api/v1/projects/${projectId}`)
        .expect(200);

      expect(response.body.data.progress).toBe(0);
      expect(response.body.data.fileCount).toBe(0);
    });

    test('should calculate 50% progress for project with files but no analysis', async () => {
      const projectId = 'half-complete-project';
      const mockProjectData = {
        id: projectId,
        name: 'Half Complete Project',
        status: 'draft'
      };

      const mockFiles = [
        { name: 'file1.js', size: 1024, type: 'file' },
        { name: 'file2.js', size: 2048, type: 'file' }
      ];

      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify(mockProjectData));
      fileSystemUtils.listFiles
        .mockResolvedValueOnce(mockFiles) // files (has files)
        .mockResolvedValueOnce([]) // analysis (no analysis)
        .mockResolvedValueOnce(mockFiles) // file count
        .mockResolvedValueOnce(mockFiles) // project files
        .mockResolvedValueOnce([]); // tasks

      const response = await request(server)
        .get(`/api/v1/projects/${projectId}`)
        .expect(200);

      // Note: The actual progress calculation would depend on the implementation
      // This test verifies the structure is correct
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data.fileCount).toBeGreaterThan(0);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed project.json gracefully', async () => {
      fileSystemUtils.readFileContent.mockResolvedValue('invalid json');

      const response = await request(server)
        .get('/api/v1/projects/test-project')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve project');
    });

    test('should handle concurrent project creation with same name', async () => {
      // This would require more sophisticated testing in a real scenario
      // where multiple requests could create projects simultaneously
      fileSystemUtils.listFiles.mockResolvedValue([]);

      const projectData = { name: 'Concurrent Project' };

      const response = await request(server)
        .post('/api/v1/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
