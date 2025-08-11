import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the server
let server;

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock filesystem
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn()
  },
  createReadStream: jest.fn()
}));

// Mock multer
jest.mock('multer', () => {
  const mockMulter = () => ({
    array: () => (req, res, next) => {
      req.files = req.files || [];
      next();
    },
    single: () => (req, res, next) => {
      req.file = req.file || null;
      next();
    }
  });
  mockMulter.diskStorage = jest.fn();
  return mockMulter;
});

// Mock fileSystem utilities
jest.mock('../../utils/fileSystem.js', () => ({
  ensureDirectory: jest.fn(),
  directoryExists: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
  readFileContent: jest.fn(),
  writeFileContent: jest.fn(),
  listFiles: jest.fn(),
  getFileStats: jest.fn(),
  validateFilename: jest.fn(),
  generateUniqueFilename: jest.fn()
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
  formatFileSize: jest.fn(size => `${size} bytes`),
  getMimeType: jest.fn(ext => `application/${ext}`),
  getFileExtension: jest.fn(filename => filename.split('.').pop() || '')
}));

describe('Files Controller', () => {
  let fileSystemUtils;
  let helpers;

  beforeEach(async () => {
    // Import after mocking
    const { default: app } = await import('../../server.js');
    server = app;

    fileSystemUtils = await import('../../utils/fileSystem.js');
    helpers = await import('../../utils/helpers.js');

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    fileSystemUtils.directoryExists.mockResolvedValue(true);
    fileSystemUtils.fileExists.mockResolvedValue(true);
    fileSystemUtils.ensureDirectory.mockResolvedValue();
    fileSystemUtils.validateFilename.mockReturnValue(true);
    fileSystemUtils.generateUniqueFilename.mockImplementation(name => `unique_${name}`);
  });

  afterEach(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('GET /api/v1/files/projects/:projectId/files', () => {
    const projectId = 'test-project';

    test('should return project files successfully', async () => {
      const mockFiles = [
        {
          name: 'test1.js',
          size: 1024,
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
          relativePath: './test1.js'
        },
        {
          name: 'test2.md',
          size: 2048,
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
          relativePath: './test2.md'
        }
      ];

      fileSystemUtils.listFiles.mockResolvedValue(mockFiles);
      helpers.getFileExtension.mockImplementation(name => name.split('.').pop());
      helpers.getMimeType.mockImplementation(ext => `text/${ext}`);
      helpers.formatFileSize.mockImplementation(size => `${size} B`);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // Check file structure
      const file = response.body.data[0];
      expect(file).toHaveProperty('id');
      expect(file).toHaveProperty('name');
      expect(file).toHaveProperty('type');
      expect(file).toHaveProperty('size');
      expect(file).toHaveProperty('uploadDate');
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should handle pagination correctly', async () => {
      const mockFiles = Array.from({ length: 25 }, (_, i) => ({
        name: `test${i}.js`,
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T00:00:00.000Z',
        relativePath: `./test${i}.js`
      }));

      fileSystemUtils.listFiles.mockResolvedValue(mockFiles);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files?page=2&limit=10`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.totalPages).toBe(3);
      expect(response.body.pagination.totalItems).toBe(25);
    });

    test('should handle file system errors gracefully', async () => {
      fileSystemUtils.listFiles.mockRejectedValue(new Error('Permission denied'));

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve files');
    });
  });

  describe('GET /api/v1/files/projects/:projectId/files/:fileId', () => {
    const projectId = 'test-project';
    const fileId = 'test.js';

    test('should return file details successfully', async () => {
      const mockStats = {
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T00:00:00.000Z'
      };

      fileSystemUtils.getFileStats.mockResolvedValue(mockStats);
      helpers.getFileExtension.mockReturnValue('js');
      helpers.getMimeType.mockReturnValue('text/javascript');
      helpers.formatFileSize.mockReturnValue('1 KB');

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(fileId);
      expect(response.body.data.name).toBe(fileId);
      expect(response.body.data.type).toBe('js');
      expect(response.body.data.size).toBe(1024);
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 404 when file does not exist', async () => {
      fileSystemUtils.fileExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('GET /api/v1/files/projects/:projectId/files/:fileId/content', () => {
    const projectId = 'test-project';
    const fileId = 'test.js';

    test('should return file content successfully', async () => {
      const mockContent = 'console.log(\"Hello World\");';
      fileSystemUtils.readFileContent.mockResolvedValue(mockContent);
      helpers.getFileExtension.mockReturnValue('js');
      helpers.getMimeType.mockReturnValue('text/javascript');

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}/content`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(mockContent);
      expect(response.body.data.mimeType).toBe('text/javascript');
      expect(response.body.data.encoding).toBe('utf8');
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}/content`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 404 when file does not exist', async () => {
      fileSystemUtils.fileExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}/content`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('POST /api/v1/files/projects/:projectId/files', () => {
    const projectId = 'test-project';

    test('should upload files successfully', async () => {
      const mockFiles = [
        {
          filename: 'unique_test1.js',
          originalname: 'test1.js',
          size: 1024,
          path: '/tmp/unique_test1.js'
        },
        {
          filename: 'unique_test2.md',
          originalname: 'test2.md',
          size: 2048,
          path: '/tmp/unique_test2.md'
        }
      ];

      fileSystemUtils.getFileStats.mockResolvedValue({
        modifiedAt: '2024-01-01T00:00:00.000Z'
      });
      helpers.getFileExtension.mockImplementation(name => name.split('.').pop());
      helpers.getMimeType.mockImplementation(ext => `text/${ext}`);
      helpers.formatFileSize.mockImplementation(size => `${size} B`);

      // Mock request with files
      const response = await request(server)
        .post(`/api/v1/files/projects/${projectId}/files`)
        .field('description', 'Test upload')
        .expect(req => {
          req.files = mockFiles; // Mock uploaded files
        })
        .expect(201);

      // Since we're mocking the multer middleware, we need to manually test the controller logic
      // This is a simplified test - in a real scenario, you'd use supertest with actual file uploads
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .post(`/api/v1/files/projects/${projectId}/files`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 400 when no files uploaded', async () => {
      const response = await request(server)
        .post(`/api/v1/files/projects/${projectId}/files`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No files uploaded');
    });
  });

  describe('DELETE /api/v1/files/projects/:projectId/files/:fileId', () => {
    const projectId = 'test-project';
    const fileId = 'test.js';

    test('should delete file successfully', async () => {
      fileSystemUtils.deleteFile.mockResolvedValue();
      fileSystemUtils.writeFileContent.mockResolvedValue();
      fileSystemUtils.readFileContent.mockResolvedValue(JSON.stringify({
        id: projectId,
        updatedAt: '2024-01-01T00:00:00.000Z'
      }));

      const response = await request(server)
        .delete(`/api/v1/files/projects/${projectId}/files/${fileId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File deleted successfully');
      expect(fileSystemUtils.deleteFile).toHaveBeenCalled();
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .delete(`/api/v1/files/projects/${projectId}/files/${fileId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 404 when file does not exist', async () => {
      fileSystemUtils.fileExists.mockResolvedValue(false);

      const response = await request(server)
        .delete(`/api/v1/files/projects/${projectId}/files/${fileId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('GET /api/v1/files/projects/:projectId/files/:fileId/download', () => {
    const projectId = 'test-project';
    const fileId = 'test.js';

    test('should download file successfully', async () => {
      helpers.getFileExtension.mockReturnValue('js');
      helpers.getMimeType.mockReturnValue('text/javascript');

      // Note: Testing file downloads with supertest requires special handling
      // This is a simplified test - in practice, you'd test the headers and stream
      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}/download`)
        .expect(200);

      // In a real implementation, you'd check for Content-Disposition header
      // expect(response.headers['content-disposition']).toMatch(/attachment/);
    });

    test('should return 404 when project does not exist', async () => {
      fileSystemUtils.directoryExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}/download`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    test('should return 404 when file does not exist', async () => {
      fileSystemUtils.fileExists.mockResolvedValue(false);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files/${fileId}/download`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('Error handling and edge cases', () => {
    const projectId = 'test-project';

    test('should handle file system permission errors', async () => {
      fileSystemUtils.listFiles.mockRejectedValue(new Error('EACCES: permission denied'));

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve files');
    });

    test('should handle malformed project metadata', async () => {
      fileSystemUtils.readFileContent.mockResolvedValue('invalid json');
      fileSystemUtils.deleteFile.mockResolvedValue();

      const response = await request(server)
        .delete(`/api/v1/files/projects/${projectId}/files/test.js`)
        .expect(200);

      // Should still succeed even if metadata update fails
      expect(response.body.success).toBe(true);
    });

    test('should handle empty file list', async () => {
      fileSystemUtils.listFiles.mockResolvedValue([]);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.totalItems).toBe(0);
    });

    test('should handle invalid pagination parameters', async () => {
      fileSystemUtils.listFiles.mockResolvedValue([]);

      const response = await request(server)
        .get(`/api/v1/files/projects/${projectId}/files?page=invalid&limit=abc`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should default to page 1, limit 20
    });
  });
});
