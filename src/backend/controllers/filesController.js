import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  ensureDirectory, 
  directoryExists, 
  fileExists,
  deleteFile, 
  readFileContent,
  writeFileContent,
  listFiles,
  getFileStats,
  validateFilename,
  generateUniqueFilename
} from '../utils/fileSystem.js';
import { 
  createResponse, 
  createErrorResponse, 
  formatFileSize,
  getMimeType,
  getFileExtension 
} from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';

const PROJECTS_BASE_PATH = process.env.PROJECT_STORAGE_PATH || './projects';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { projectId } = req.params;
      const uploadPath = path.join(PROJECTS_BASE_PATH, projectId, 'files');
      await ensureDirectory(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      validateFilename(file.originalname);
      // Generate unique filename to prevent conflicts
      const uniqueName = generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    } catch (error) {
      cb(error);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    try {
      const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
        '.md', '.txt', '.json', '.js', '.ts', '.py', '.java', 
        '.html', '.css', '.scss', '.xml', '.yml', '.yaml'
      ];
      
      const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
      
      if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new AppError(
          `File type ${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`, 
          400
        ));
      }
    } catch (error) {
      cb(error);
    }
  }
});

/**
 * Get all files for a project
 */
export const getProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const filesPath = path.join(projectPath, 'files');
    
    // Check if project exists
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Ensure files directory exists
    await ensureDirectory(filesPath);
    
    // Get all files
    const files = await listFiles(filesPath, { filesOnly: true });
    
    // Transform file data
    const fileList = await Promise.all(files.map(async (file) => {
      const extension = getFileExtension(file.name);
      const mimeType = getMimeType(extension);
      
      return {
        id: file.name, // Using filename as ID
        name: file.name,
        originalName: file.name, // TODO: Store original names separately
        type: extension,
        mimeType,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        uploadDate: file.createdAt,
        modifiedDate: file.modifiedAt,
        status: 'uploaded', // TODO: Track processing status
        path: file.relativePath
      };
    }));
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = fileList.slice(startIndex, endIndex);
    
    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(fileList.length / limit),
      totalItems: fileList.length,
      itemsPerPage: parseInt(limit),
      hasNextPage: endIndex < fileList.length,
      hasPrevPage: page > 1
    };
    
    res.json(createResponse(
      paginatedFiles,
      'Files retrieved successfully',
      200,
      { pagination }
    ));
  } catch (error) {
    console.error('Error getting project files:', error);
    res.status(500).json(createErrorResponse('Failed to retrieve files', 500, error.message));
  }
};

/**
 * Get file by ID
 */
export const getFileById = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const filePath = path.join(projectPath, 'files', fileId);
    
    // Check if project exists
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Check if file exists
    if (!(await fileExists(filePath))) {
      return res.status(404).json(createErrorResponse('File not found', 404));
    }
    
    const stats = await getFileStats(filePath);
    const extension = getFileExtension(fileId);
    const mimeType = getMimeType(extension);
    
    const fileData = {
      id: fileId,
      name: fileId,
      type: extension,
      mimeType,
      size: stats.size,
      formattedSize: formatFileSize(stats.size),
      uploadDate: stats.createdAt,
      modifiedDate: stats.modifiedAt,
      status: 'uploaded'
    };
    
    res.json(createResponse(fileData, 'File retrieved successfully'));
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json(createErrorResponse('Failed to retrieve file', 500, error.message));
  }
};

/**
 * Get file content
 */
export const getFileContent = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const filePath = path.join(projectPath, 'files', fileId);
    
    // Check if project exists
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Check if file exists
    if (!(await fileExists(filePath))) {
      return res.status(404).json(createErrorResponse('File not found', 404));
    }
    
    const content = await readFileContent(filePath);
    const extension = getFileExtension(fileId);
    const mimeType = getMimeType(extension);
    
    res.json(createResponse(
      { content, mimeType, encoding: 'utf8' },
      'File content retrieved successfully'
    ));
  } catch (error) {
    console.error('Error getting file content:', error);
    res.status(500).json(createErrorResponse('Failed to retrieve file content', 500, error.message));
  }
};

/**
 * Upload files to project
 */
export const uploadFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { description = '' } = req.body;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    
    // Check if project exists
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(createErrorResponse('No files uploaded', 400));
    }
    
    // Process uploaded files
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const extension = getFileExtension(file.filename);
      const mimeType = getMimeType(extension);
      const stats = await getFileStats(file.path);
      
      const fileData = {
        id: file.filename,
        name: file.filename,
        originalName: file.originalname,
        type: extension,
        mimeType,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        uploadDate: new Date().toISOString(),
        modifiedDate: stats.modifiedAt,
        status: 'uploaded',
        description: description || ''
      };
      
      uploadedFiles.push(fileData);
    }
    
    // Update project metadata
    await updateProjectMetadata(projectId);
    
    res.status(201).json(createResponse(
      uploadedFiles,
      `${uploadedFiles.length} file(s) uploaded successfully`,
      201
    ));
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json(createErrorResponse('Failed to upload files', 500, error.message));
  }
};

/**
 * Delete file
 */
export const deleteFileById = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const filePath = path.join(projectPath, 'files', fileId);
    
    // Check if project exists
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Check if file exists
    if (!(await fileExists(filePath))) {
      return res.status(404).json(createErrorResponse('File not found', 404));
    }
    
    // Delete file
    await deleteFile(filePath);
    
    // Update project metadata
    await updateProjectMetadata(projectId);
    
    res.json(createResponse(null, 'File deleted successfully'));
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json(createErrorResponse('Failed to delete file', 500, error.message));
  }
};

/**
 * Download file
 */
export const downloadFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const filePath = path.join(projectPath, 'files', fileId);
    
    // Check if project exists
    if (!(await directoryExists(projectPath))) {
      return res.status(404).json(createErrorResponse('Project not found', 404));
    }
    
    // Check if file exists
    if (!(await fileExists(filePath))) {
      return res.status(404).json(createErrorResponse('File not found', 404));
    }
    
    const extension = getFileExtension(fileId);
    const mimeType = getMimeType(extension);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json(createErrorResponse('Failed to download file', 500, error.message));
  }
};

/**
 * Helper function to update project metadata after file operations
 */
const updateProjectMetadata = async (projectId) => {
  try {
    const projectPath = path.join(PROJECTS_BASE_PATH, projectId);
    const projectJsonPath = path.join(projectPath, 'project.json');
    
    if (await fileExists(projectJsonPath)) {
      const projectData = JSON.parse(await readFileContent(projectJsonPath));
      projectData.updatedAt = new Date().toISOString();
      await writeFileContent(projectJsonPath, JSON.stringify(projectData, null, 2));
    }
  } catch (error) {
    console.warn('Failed to update project metadata:', error.message);
  }
};

// Export multer middleware
export const uploadMiddleware = upload;
