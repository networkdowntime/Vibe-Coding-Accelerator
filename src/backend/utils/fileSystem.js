import fs from 'fs/promises';
import path from 'path';

/**
 * File system utility functions with security checks
 */

/**
 * Ensure directory exists, create if it doesn't
 */
export const ensureDirectory = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
};

/**
 * Check if directory exists
 */
export const directoryExists = async (dirPath) => {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

/**
 * Check if file exists
 */
export const fileExists = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
};

/**
 * Get safe file path to prevent directory traversal
 */
export const getSafeFilePath = (basePath, ...pathSegments) => {
  const fullPath = path.resolve(basePath, ...pathSegments);
  const normalizedBasePath = path.resolve(basePath);
  
  // Ensure the resulting path is within the base directory
  if (!fullPath.startsWith(normalizedBasePath)) {
    throw new Error('Invalid file path: directory traversal detected');
  }
  
  return fullPath;
};

/**
 * Read file content safely
 */
export const readFileContent = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

/**
 * Write file content safely
 */
export const writeFileContent = async (filePath, content) => {
  try {
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await ensureDirectory(dirPath);
    
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
};

/**
 * Delete file safely
 */
export const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
};

/**
 * Delete directory recursively
 */
export const deleteDirectory = async (dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to delete directory: ${error.message}`);
    }
  }
};

/**
 * List files in directory with metadata
 */
export const listFiles = async (dirPath, options = {}) => {
  try {
    const { filesOnly = false, recursive = false } = options;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(fullPath);
      
      if (entry.isFile() || (!filesOnly && entry.isDirectory())) {
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(dirPath, fullPath),
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        });
      }
      
      // Recursive listing for directories
      if (recursive && entry.isDirectory()) {
        const subFiles = await listFiles(fullPath, options);
        files.push(...subFiles);
      }
    }
    
    return files;
  } catch (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

/**
 * Get file statistics
 */
export const getFileStats = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
};

/**
 * Copy file from source to destination
 */
export const copyFile = async (sourcePath, destPath) => {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await ensureDirectory(destDir);
    
    await fs.copyFile(sourcePath, destPath);
  } catch (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
};

/**
 * Move file from source to destination
 */
export const moveFile = async (sourcePath, destPath) => {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await ensureDirectory(destDir);
    
    await fs.rename(sourcePath, destPath);
  } catch (error) {
    throw new Error(`Failed to move file: ${error.message}`);
  }
};

/**
 * Create project directory structure
 */
export const createProjectStructure = async (projectPath) => {
  try {
    await ensureDirectory(projectPath);
    await ensureDirectory(path.join(projectPath, 'files'));
    await ensureDirectory(path.join(projectPath, 'outputs'));
    await ensureDirectory(path.join(projectPath, 'reports'));
  } catch (error) {
    throw new Error(`Failed to create project structure: ${error.message}`);
  }
};

/**
 * Clean up project directory
 */
export const cleanupProject = async (projectPath) => {
  try {
    if (await directoryExists(projectPath)) {
      await deleteDirectory(projectPath);
    }
  } catch (error) {
    throw new Error(`Failed to cleanup project: ${error.message}`);
  }
};

/**
 * Get directory size recursively
 */
export const getDirectorySize = async (dirPath) => {
  try {
    let totalSize = 0;
    const files = await listFiles(dirPath, { recursive: true, filesOnly: true });
    
    for (const file of files) {
      totalSize += file.size;
    }
    
    return totalSize;
  } catch (error) {
    throw new Error(`Failed to calculate directory size: ${error.message}`);
  }
};

/**
 * Validate filename for security
 */
export const validateFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename is required and must be a string');
  }
  
  // Check for directory traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Filename contains invalid characters');
  }
  
  // Check for system files
  const systemFiles = ['.htaccess', '.env', 'web.config', 'package.json'];
  if (systemFiles.includes(filename.toLowerCase())) {
    throw new Error('Filename is reserved');
  }
  
  // Check length
  if (filename.length > 255) {
    throw new Error('Filename is too long');
  }
  
  return true;
};

/**
 * Generate unique filename to prevent conflicts
 */
export const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  const sanitizedName = nameWithoutExt.replace(/[^\w\-_]/g, '_').toLowerCase();
  
  return `${sanitizedName}-${timestamp}-${random}${extension}`;
};
