const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const projectRoutes = require('../../src/backend/routes/projectRoutes.js');
const fileRoutes = require('../../src/backend/routes/fileRoutes.js');

const PROJECTS_DIR = path.resolve(__dirname, '../../projects');

const app = express();
app.use(express.json());
app.use('/api/projects', projectRoutes);
app.use('/api/projects', fileRoutes);

describe('File Management API', () => {
  const testProjectName = 'testFileProject';
  const testFilePath = path.join(__dirname, 'test-file.txt');
  const testMarkdownPath = path.join(__dirname, 'test-readme.md');
  const testYamlPath = path.join(__dirname, 'test-config.yml');
  
  beforeAll(async () => {
    if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
    
    // Create a test project
    await request(app)
      .post('/api/projects')
      .send({ name: testProjectName });
    
    // Create test files
    fs.writeFileSync(testFilePath, 'This is a test file content for upload testing');
    fs.writeFileSync(testMarkdownPath, '# Test README\n\nThis is a markdown file for testing.');
    fs.writeFileSync(testYamlPath, 'name: test\nversion: 1.0\ndescription: Test configuration');
  });

  afterAll(() => {
    // Clean up test project and test files
    const projectPath = path.join(PROJECTS_DIR, testProjectName);
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    
    // Clean up test files
    [testFilePath, testMarkdownPath, testYamlPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('File Listing', () => {
    it('should list files in a project (empty initially)', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/projects/nonexistent/files');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('File Upload', () => {
    it('should upload a text file to a project', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', testFilePath);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('test-file.txt');
      expect(res.body.type).toBe('.txt');
      expect(res.body.message).toBe('File uploaded successfully');
    });

    it('should upload a markdown file', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', testMarkdownPath);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('test-readme.md');
      expect(res.body.type).toBe('.md');
    });

    it('should upload a YAML file', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', testYamlPath);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('test-config.yml');
      expect(res.body.type).toBe('.yml');
    });

    it('should reject unsupported file types', async () => {
      // Create a temporary .js file
      const jsFilePath = path.join(__dirname, 'test-script.js');
      fs.writeFileSync(jsFilePath, 'console.log("test");');

      const res = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', jsFilePath);
      
      expect(res.statusCode).toBe(400);
      expect(res.text).toContain('Unsupported file type');

      // Clean up
      fs.unlinkSync(jsFilePath);
    });

    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectName}/files`);
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .post('/api/projects/nonexistent/files')
        .attach('file', testFilePath);
      
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('File Listing After Upload', () => {
    it('should list all uploaded files', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files`);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(3);
      
      const fileNames = res.body.map(f => f.name);
      expect(fileNames).toContain('test-file.txt');
      expect(fileNames).toContain('test-readme.md');
      expect(fileNames).toContain('test-config.yml');
      
      // Check file metadata
      const txtFile = res.body.find(f => f.name === 'test-file.txt');
      expect(txtFile.type).toBe('.txt');
      expect(txtFile.size).toBeGreaterThan(0);
      expect(txtFile.createdAt).toBeDefined();
      expect(txtFile.modifiedAt).toBeDefined();
    });

    it('should sort files by creation date (newest first)', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files`);
      expect(res.statusCode).toBe(200);
      
      const files = res.body;
      for (let i = 1; i < files.length; i++) {
        const prevDate = new Date(files[i - 1].createdAt);
        const currDate = new Date(files[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('File Retrieval', () => {
    it('should get a text file content', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files/test-file.txt`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('This is a test file content for upload testing');
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    });

    it('should get a markdown file content', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files/test-readme.md`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('# Test README');
      expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    });

    it('should get a YAML file content', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files/test-config.yml`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('name: test');
      expect(res.headers['content-type']).toBe('text/yaml; charset=utf-8');
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app).get(`/api/projects/${testProjectName}/files/nonexistent.txt`);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('File not found');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/projects/nonexistent/files/test.txt');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('File Rename', () => {
    it('should rename a file successfully', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProjectName}/files/test-file.txt`)
        .send({ newName: 'renamed-file.txt' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.oldName).toBe('test-file.txt');
      expect(res.body.newName).toBe('renamed-file.txt');
      expect(res.body.message).toBe('File renamed successfully');
      
      // Verify old file is gone and new file exists
      const listRes = await request(app).get(`/api/projects/${testProjectName}/files`);
      const fileNames = listRes.body.map(f => f.name);
      expect(fileNames).toContain('renamed-file.txt');
      expect(fileNames).not.toContain('test-file.txt');
    });

    it('should return 400 when new name is empty', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProjectName}/files/test-readme.md`)
        .send({ newName: '' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('New file name is required');
    });

    it('should return 409 when target file already exists', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProjectName}/files/test-readme.md`)
        .send({ newName: 'renamed-file.txt' }); // This file already exists
      
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('File with new name already exists');
    });

    it('should return 400 for unsupported file type in new name', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProjectName}/files/test-readme.md`)
        .send({ newName: 'test-script.js' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Unsupported file type');
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProjectName}/files/nonexistent.txt`)
        .send({ newName: 'new-name.txt' });
      
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('File not found');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .put('/api/projects/nonexistent/files/test.txt')
        .send({ newName: 'new-name.txt' });
      
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('File Deletion', () => {
    it('should delete a file successfully', async () => {
      const res = await request(app).delete(`/api/projects/${testProjectName}/files/test-config.yml`);
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('test-config.yml');
      expect(res.body.message).toBe('File deleted successfully');
      
      // Verify file is deleted
      const listRes = await request(app).get(`/api/projects/${testProjectName}/files`);
      const fileNames = listRes.body.map(f => f.name);
      expect(fileNames).not.toContain('test-config.yml');
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app).delete(`/api/projects/${testProjectName}/files/nonexistent.txt`);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('File not found');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).delete('/api/projects/nonexistent/files/test.txt');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('File Operations Edge Cases', () => {
    it('should handle file operations after project files directory is manually deleted', async () => {
      // Manually remove the files directory
      const filesDir = path.join(PROJECTS_DIR, testProjectName, 'files');
      if (fs.existsSync(filesDir)) {
        fs.rmSync(filesDir, { recursive: true, force: true });
      }

      // List should return empty array, not error
      const listRes = await request(app).get(`/api/projects/${testProjectName}/files`);
      expect(listRes.statusCode).toBe(200);
      expect(listRes.body).toEqual([]);

      // Upload should still work (creates directory)
      const uploadRes = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', testFilePath);
      expect(uploadRes.statusCode).toBe(201);
    });

    it('should handle duplicate file uploads (overwrite)', async () => {
      // Upload the same file twice
      const res1 = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', testMarkdownPath);
      expect(res1.statusCode).toBe(201);

      const res2 = await request(app)
        .post(`/api/projects/${testProjectName}/files`)
        .attach('file', testMarkdownPath);
      expect(res2.statusCode).toBe(201);

      // Should only have one copy of the file
      const listRes = await request(app).get(`/api/projects/${testProjectName}/files`);
      const readmeFiles = listRes.body.filter(f => f.name === 'test-readme.md');
      expect(readmeFiles.length).toBe(1);
    });
  });
});
