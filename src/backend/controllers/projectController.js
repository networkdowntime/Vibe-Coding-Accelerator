
const projectUtils = require('../utils/projectUtils');

exports.listProjects = (req, res) => {
  try {
    const projects = projectUtils.listProjects();
    res.json(projects);
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
};

exports.createProject = (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Project name required' });
  }
  try {
    if (projectUtils.projectExists(name)) {
      return res.status(409).json({ error: 'Duplicate project name' });
    }
    const project = projectUtils.createProject(name);
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.getProject = (req, res) => {
  const { id } = req.params;
  try {
    if (!projectUtils.projectExists(id)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ name: id });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to get project' });
  }
};

exports.updateProject = (req, res) => {
  const { id } = req.params;
  const { name: newName } = req.body;
  if (!newName || typeof newName !== 'string') {
    return res.status(400).json({ error: 'New project name required' });
  }
  try {
    if (!projectUtils.projectExists(id)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectUtils.projectExists(newName)) {
      return res.status(409).json({ error: 'Duplicate project name' });
    }
    const project = projectUtils.renameProject(id, newName);
    res.json(project);
  } catch (err) {
    console.error('Rename project error:', err);
    res.status(500).json({ error: 'Failed to rename project' });
  }
};

exports.deleteProject = (req, res) => {
  const { id } = req.params;
  try {
    if (!projectUtils.projectExists(id)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    projectUtils.deleteProject(id);
    res.status(204).end();
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
