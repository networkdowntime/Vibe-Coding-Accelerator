const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.resolve(__dirname, '../../../projects');

function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/^./, (m) => m.toLowerCase());
}

function getProjectDir(name) {
  return path.join(PROJECTS_DIR, toCamelCase(name.toLowerCase()));
}


function listProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR)
    .filter((d) => !d.endsWith('.deleted'))
    .map((d) => ({ name: toCamelCase(d) }));
}

function projectExists(name) {
  const dir = getProjectDir(name);
  return fs.existsSync(dir);
}


function createProject(name) {
  const dir = getProjectDir(name);
  if (fs.existsSync(dir)) throw new Error('Project already exists');
  fs.mkdirSync(dir, { recursive: true });
  return { name: toCamelCase(path.basename(dir)) };
}


function renameProject(oldName, newName) {
  const oldDir = getProjectDir(oldName);
  const newDir = getProjectDir(newName);
  if (!fs.existsSync(oldDir)) throw new Error('Project not found');
  if (fs.existsSync(newDir)) throw new Error('Duplicate project name');
  fs.renameSync(oldDir, newDir);
  return { name: toCamelCase(path.basename(newDir)) };
}

function deleteProject(name) {
  const dir = getProjectDir(name);
  if (!fs.existsSync(dir)) throw new Error('Project not found');
  fs.renameSync(dir, dir + '.deleted');
}

module.exports = {
  toCamelCase,
  getProjectDir,
  listProjects,
  projectExists,
  createProject,
  renameProject,
  deleteProject,
};
