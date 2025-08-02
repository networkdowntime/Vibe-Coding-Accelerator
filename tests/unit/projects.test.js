const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const projectRoutes = require('../../src/backend/routes/projectRoutes.js');

const PROJECTS_DIR = path.resolve(__dirname, '../../../projects');

const app = express();
app.use(express.json());
app.use('/api/projects', projectRoutes);

describe('Project CRUD API', () => {
  beforeAll(() => {
    if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
  });
  afterEach(() => {
    // Clean up all test projects and .deleted folders
    fs.readdirSync(PROJECTS_DIR).forEach((d) => {
      if (d.startsWith('testproject')) {
        fs.rmSync(path.join(PROJECTS_DIR, d), { recursive: true, force: true });
      }
      if (d.startsWith('testproject') && d.endsWith('.deleted')) {
        fs.rmSync(path.join(PROJECTS_DIR, d), { recursive: true, force: true });
      }
    });
  });

  it('should create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'TestProject1' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('testproject1');
  });

  it('should not allow duplicate project names', async () => {
    await request(app).post('/api/projects').send({ name: 'TestProject2' });
    const res = await request(app).post('/api/projects').send({ name: 'TestProject2' });
    expect(res.statusCode).toBe(409);
  });

  it('should list projects', async () => {
    await request(app).post('/api/projects').send({ name: 'TestProject3' });
    const res = await request(app).get('/api/projects');
    expect(res.statusCode).toBe(200);
    expect(res.body.some((p) => p.name === 'testproject3')).toBe(true);
  });

  it('should rename a project', async () => {
    await request(app).post('/api/projects').send({ name: 'TestProject4' });
    const res = await request(app)
      .put('/api/projects/testProject4')
      .send({ name: 'TestProject4Renamed' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('testproject4renamed');
  });

  it('should delete a project', async () => {
    await request(app).post('/api/projects').send({ name: 'TestProject5' });
    const res = await request(app).delete('/api/projects/testProject5');
    expect(res.statusCode).toBe(204);
    // Should not be listed anymore
    const listRes = await request(app).get('/api/projects');
    expect(listRes.body.some((p) => p.name === 'testProject5')).toBe(false);
  });
});
