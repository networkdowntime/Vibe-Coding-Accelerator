const fs = require('fs');
const path = require('path');
const { toCamelCase, toReadableName } = require('../utils/stringUtils');

const PROJECTS_DIR = path.resolve(__dirname, '../../../projects');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

const projectController = {
  // Get all non-deleted projects
  getAllProjects: (req, res) => {
    try {
      const projects = fs.readdirSync(PROJECTS_DIR)
        .filter(dir => !dir.endsWith('.deleted'))
        .map(dirName => {
          const projectPath = path.join(PROJECTS_DIR, dirName);
          const stats = fs.statSync(projectPath);
          return {
            name: dirName,
            displayName: toReadableName(dirName),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(projects);
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({ error: 'Failed to retrieve projects' });
    }
  },

  // Create a new project
  createProject: (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const camelCaseName = toCamelCase(name);
      const projectPath = path.join(PROJECTS_DIR, camelCaseName);

      // Check for duplicate names (including deleted projects)
      const existingProjects = fs.readdirSync(PROJECTS_DIR);
      const isDuplicate = existingProjects.some(dir => 
        dir === camelCaseName || dir === `${camelCaseName}.deleted`
      );

      if (isDuplicate) {
        return res.status(409).json({ error: 'Project name already exists' });
      }

      // Create project directory
      fs.mkdirSync(projectPath, { recursive: true });

      // Create basic project structure
      fs.mkdirSync(path.join(projectPath, 'docs'), { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'configs'), { recursive: true });

      res.status(201).json({
        name: camelCaseName,
        displayName: toReadableName(camelCaseName),
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  },

  // Rename a project
  renameProject: (req, res) => {
    try {
      const { projectName } = req.params;
      const { newName } = req.body;

      if (!newName || newName.trim() === '') {
        return res.status(400).json({ error: 'New project name is required' });
      }

      const oldPath = path.join(PROJECTS_DIR, projectName);
      const newCamelCaseName = toCamelCase(newName);
      const newPath = path.join(PROJECTS_DIR, newCamelCaseName);

      // Check if old project exists
      if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check for duplicate names
      const existingProjects = fs.readdirSync(PROJECTS_DIR);
      const isDuplicate = existingProjects.some(dir => 
        dir === newCamelCaseName || dir === `${newCamelCaseName}.deleted`
      );

      if (isDuplicate && newCamelCaseName !== projectName) {
        return res.status(409).json({ error: 'Project name already exists' });
      }

      // Rename directory
      fs.renameSync(oldPath, newPath);

      res.json({
        oldName: projectName,
        newName: newCamelCaseName,
        displayName: toReadableName(newCamelCaseName),
        message: 'Project renamed successfully'
      });
    } catch (error) {
      console.error('Error renaming project:', error);
      res.status(500).json({ error: 'Failed to rename project' });
    }
  },

  // Delete a project (soft delete)
  deleteProject: (req, res) => {
    try {
      const { projectName } = req.params;
      const projectPath = path.join(PROJECTS_DIR, projectName);
      const deletedPath = path.join(PROJECTS_DIR, `${projectName}.deleted`);

      // Check if project exists
      if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if already deleted
      if (fs.existsSync(deletedPath)) {
        return res.status(409).json({ error: 'Project already deleted' });
      }

      // Rename to .deleted
      fs.renameSync(projectPath, deletedPath);

      res.json({
        name: projectName,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
};

module.exports = projectController;
