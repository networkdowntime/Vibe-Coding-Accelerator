import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { 
  ensureDirectory, 
  directoryExists, 
  deleteDirectory, 
  writeFileContent, 
  readFileContent,
  getFileStats,
  listFiles
} from '../utils/fileSystem.js';
import { 
  createResponse, 
  createErrorResponse, 
  sanitizeForFilename, 
  paginate 
} from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';

const PROJECTS_BASE_PATH = process.env.PROJECT_STORAGE_PATH || './projects';

/**
 * Get all projects
 */
export const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    
    // Ensure projects directory exists
    await ensureDirectory(PROJECTS_BASE_PATH);
    
    // Get all project directories
    const projectDirs = await listFiles(PROJECTS_BASE_PATH, { dirsOnly: true });
    
    const projects = [];
    
    for (const dir of projectDirs) {
      try {
        const projectJsonPath = path.join(dir.path, 'project.json');
        const projectData = JSON.parse(await readFileContent(projectJsonPath));
        
        // Apply filters
        if (status && projectData.status !== status) continue;
        if (search && !projectData.name.toLowerCase().includes(search.toLowerCase()) && 
            !projectData.description.toLowerCase().includes(search.toLowerCase())) continue;
        
        // Add computed fields
        projectData.progress = await calculateProjectProgress(dir.path);
        projectData.fileCount = await getProjectFileCount(dir.path);
        
        projects.push(projectData);
      } catch (error) {
        // Skip projects with invalid project.json
        console.warn(`Skipping invalid project directory: ${dir.name}`, error.message);
        continue;
      }
    }
    
    // Sort projects
    projects.sort((a, b) => {
      let comparison = 0;
      if (a[sortBy] < b[sortBy]) comparison = -1;
      if (a[sortBy] > b[sortBy]) comparison = 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Paginate results
    const paginatedProjects = paginate(projects, parseInt(page), parseInt(limit));
    
    res.json(createResponse(
      paginatedProjects.data,
      'Projects retrieved successfully',
      200,
      {
        pagination: paginatedProjects.pagination,
        filters: { status, search, sortBy, sortOrder }
      }
    ));
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json(createErrorResponse('Failed to retrieve projects', 500, error.message));
  }
};

/**
 * Get project by ID
 */
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, id);
    const projectJsonPath = path.join(projectPath, 'project.json');
    
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    const projectData = JSON.parse(await readFileContent(projectJsonPath));
    
    // Add computed fields
    projectData.progress = await calculateProjectProgress(projectPath);
    projectData.fileCount = await getProjectFileCount(projectPath);
    projectData.files = await getProjectFiles(projectPath);
    projectData.tasks = await getProjectTasks(projectPath);
    
    res.json(createResponse(projectData, 'Project retrieved successfully'));
  } catch (error) {
    console.error('Error getting project:', error);
    if (error.code === 'ENOENT') {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    res.status(500).json(createErrorResponse('Failed to retrieve project', 500, error.message));
  }
};

/**
 * Create new project
 */
export const createProject = async (req, res) => {
  try {
    const { name, description = '', tags = [] } = req.body;
    
    const projectId = uuidv4();
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const projectJsonPath = path.join(projectPath, 'project.json');
    
    // Check if project with same name exists
    const existingProjects = await getAllProjectsInternal();
    const nameExists = existingProjects.some(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (nameExists) {
      return res.status(409).json(createErrorResponse('Project with this name already exists', 409));
    }
    
    // Create project directory structure
    await ensureDirectory(projectPath);
    await ensureDirectory(path.join(projectPath, 'files'));
    await ensureDirectory(path.join(projectPath, 'analysis'));
    await ensureDirectory(path.join(projectPath, 'output'));
    
    // Create project metadata
    const projectData = {
      id: projectId,
      name,
      description,
      status: 'draft',
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system', // TODO: Add user authentication
      settings: {
        autoAnalysis: true,
        aiModel: 'default',
        outputFormat: 'markdown'
      }
    };
    
    // Save project metadata
    await writeFileContent(projectJsonPath, JSON.stringify(projectData, null, 2));
    
    // Create initial README
    const readmeContent = `# ${name}

${description}

## Project Information
- **ID**: ${projectId}
- **Created**: ${new Date().toISOString()}
- **Status**: Draft

## Getting Started
1. Upload your project files
2. Configure AI analysis settings
3. Run analysis to get insights and suggestions

## Files
This directory will contain your uploaded project files.

## Analysis
AI analysis results will be stored in the analysis directory.

## Output
Generated documentation and reports will be stored in the output directory.
`;
    
    await writeFileContent(path.join(projectPath, 'README.md'), readmeContent);
    
    // Add computed fields for response
    projectData.progress = 0;
    projectData.fileCount = 0;
    projectData.files = [];
    projectData.tasks = [];
    
    res.status(201).json(createResponse(projectData, 'Project created successfully', 201));
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json(createErrorResponse('Failed to create project', 500, error.message));
  }
};

/**
 * Update project
 */
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, tags } = req.body;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, id);
    const projectJsonPath = path.join(projectPath, 'project.json');
    
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Read existing project data
    const projectData = JSON.parse(await readFileContent(projectJsonPath));
    
    // Check if new name conflicts with existing projects (if name is being changed)
    if (name && name !== projectData.name) {
      const existingProjects = await getAllProjectsInternal();
      const nameExists = existingProjects.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase());
      
      if (nameExists) {
        return res.status(409).json(createErrorResponse('Project with this name already exists', 409));
      }
    }
    
    // Update fields
    if (name !== undefined) projectData.name = name;
    if (description !== undefined) projectData.description = description;
    if (status !== undefined) projectData.status = status;
    if (tags !== undefined) projectData.tags = tags;
    projectData.updatedAt = new Date().toISOString();
    
    // Save updated project data
    await writeFileContent(projectJsonPath, JSON.stringify(projectData, null, 2));
    
    // Add computed fields for response
    projectData.progress = await calculateProjectProgress(projectPath);
    projectData.fileCount = await getProjectFileCount(projectPath);
    projectData.files = await getProjectFiles(projectPath);
    projectData.tasks = await getProjectTasks(projectPath);
    
    res.json(createResponse(projectData, 'Project updated successfully'));
  } catch (error) {
    console.error('Error updating project:', error);
    if (error.code === 'ENOENT') {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    res.status(500).json(createErrorResponse('Failed to update project', 500, error.message));
  }
};

/**
 * Delete project
 */
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, id);
    
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Rename project directory with .deleted extension instead of permanent deletion
    const deletedPath = projectPath + '.deleted';
    console.log(`Renaming project from ${projectPath} to ${deletedPath}`);
    await fs.rename(projectPath, deletedPath);
    console.log(`Successfully renamed project to ${deletedPath}`);
    
    res.json(createResponse(null, 'Project deleted successfully'));
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json(createErrorResponse('Failed to delete project', 500, error.message));
  }
};

/**
 * Helper function to get all projects (internal use)
 */
const getAllProjectsInternal = async () => {
  try {
    await ensureDirectory(PROJECTS_BASE_PATH);
    const projectDirs = await listFiles(PROJECTS_BASE_PATH, { dirsOnly: true });
    const projects = [];
    
    for (const dir of projectDirs) {
      try {
        const projectJsonPath = path.join(dir.path, 'project.json');
        const projectData = JSON.parse(await readFileContent(projectJsonPath));
        projects.push(projectData);
      } catch (error) {
        // Skip invalid projects
        continue;
      }
    }
    
    return projects;
  } catch (error) {
    return [];
  }
};

/**
 * Calculate project progress based on files and analysis
 */
const calculateProjectProgress = async (projectPath) => {
  try {
    const filesPath = path.join(projectPath, 'files');
    const analysisPath = path.join(projectPath, 'analysis');
    
    const files = await listFiles(filesPath, { filesOnly: true });
    const analysisFiles = await listFiles(analysisPath, { filesOnly: true });
    
    if (files.length === 0) return 0;
    
    // Simple progress calculation: 50% for having files, 50% for having analysis
    let progress = 0;
    if (files.length > 0) progress += 50;
    if (analysisFiles.length > 0) progress += 50;
    
    return Math.min(progress, 100);
  } catch (error) {
    return 0;
  }
};

/**
 * Get project file count
 */
const getProjectFileCount = async (projectPath) => {
  try {
    const filesPath = path.join(projectPath, 'files');
    const files = await listFiles(filesPath, { filesOnly: true });
    return files.length;
  } catch (error) {
    return 0;
  }
};

/**
 * Get project files with metadata
 */
const getProjectFiles = async (projectPath) => {
  try {
    const filesPath = path.join(projectPath, 'files');
    const files = await listFiles(filesPath, { filesOnly: true });
    
    return files.map(file => ({
      id: file.name, // Using filename as ID for now
      name: file.name,
      type: path.extname(file.name).substring(1) || 'unknown',
      size: file.size,
      uploadDate: file.createdAt,
      modifiedDate: file.modifiedAt,
      status: 'uploaded' // TODO: Track actual processing status
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Get project tasks (placeholder for future implementation)
 */
const getProjectTasks = async (projectPath) => {
  try {
    // TODO: Implement task tracking
    return [];
  } catch (error) {
    return [];
  }
};
