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
  
  beforeAll(async () => {
    if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
    
    // Create a test project
    await request(app)
      .post('/api/projects')
      .send({ name: testProjectName });
    
    // Create a test file
    fs.writeFileSync(testFilePath, 'This is a test file content');
  });

  afterAll(() => {
    // Clean up test project and test file
    const projectPath = path.join(PROJECTS_DIR, testProjectName);
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should list files in a project (empty initially)', async () => {
    const res = await request(app).get(`/api/projects/${testProjectName}/files`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should upload a file to a project', async () => {
    const res = await request(app)
      .post(`/api/projects/${testProjectName}/files`)
      .attach('file', testFilePath);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('test-file.txt');
    expect(res.body.type).toBe('.txt');
  });

  it('should list files after upload', async () => {
    const res = await request(app).get(`/api/projects/${testProjectName}/files`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('test-file.txt');
  });

  it('should get a file content', async () => {
    const res = await request(app).get(`/api/projects/${testProjectName}/files/test-file.txt`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('This is a test file content');
  });

  it('should rename a file', async () => {
    const res = await request(app)
      .put(`/api/projects/${testProjectName}/files/test-file.txt`)
      .send({ newName: 'renamed-file.txt' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.newName).toBe('renamed-file.txt');
    
    // Verify old file is gone and new file exists
    const listRes = await request(app).get(`/api/projects/${testProjectName}/files`);
    expect(listRes.body.some(f => f.name === 'renamed-file.txt')).toBe(true);
    expect(listRes.body.some(f => f.name === 'test-file.txt')).toBe(false);
  });

  it('should delete a file', async () => {
    const res = await request(app).delete(`/api/projects/${testProjectName}/files/renamed-file.txt`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('File deleted successfully');
    
    // Verify file is deleted
    const listRes = await request(app).get(`/api/projects/${testProjectName}/files`);
    expect(listRes.body.length).toBe(0);
  });

  it('should return 404 for non-existent project', async () => {
    const res = await request(app).get('/api/projects/nonexistent/files');
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for non-existent file', async () => {
    const res = await request(app).get(`/api/projects/${testProjectName}/files/nonexistent.txt`);
    expect(res.statusCode).toBe(404);
  });
});
