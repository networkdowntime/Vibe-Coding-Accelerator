/**
 * Utility helper functions
 */

/**
 * Create standardized API response format
 */
export const createResponse = (data, message = 'Success', statusCode = 200, meta = {}) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create standardized error response format
 */
export const createErrorResponse = (message, statusCode = 500, details = null) => {
  return {
    success: false,
    statusCode,
    message,
    error: details,
    timestamp: new Date().toISOString()
  };
};

/**
 * Sanitize string for use in filenames or paths
 */
export const sanitizeString = (str) => {
  if (!str) return '';
  return str
    .replace(/[^\w\-_\.\s]/g, '') // Remove special characters except dash, underscore, dot, space
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .toLowerCase()
    .trim();
};

/**
 * Generate a random UUID-like string
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (extension) => {
  const mimeTypes = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.py': 'text/x-python',
    '.java': 'text/x-java-source',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.scss': 'text/scss',
    '.xml': 'application/xml',
    '.yml': 'application/yaml',
    '.yaml': 'application/yaml',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  if (!filename || !filename.includes('.')) return '';
  return '.' + filename.split('.').pop().toLowerCase();
};

/**
 * Generate unique filename to prevent conflicts
 */
export const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.replace(extension, '');
  const sanitizedName = sanitizeString(nameWithoutExt);
  
  return `${sanitizedName}-${timestamp}-${random}${extension}`;
};

/**
 * Validate if string is a valid JSON
 */
export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Capitalize first letter of a string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generate a slug from text
 */
export const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .trim();
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Escape HTML to prevent XSS
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Format date to ISO string with timezone
 */
export const formatDate = (date = new Date()) => {
  return new Date(date).toISOString();
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};
