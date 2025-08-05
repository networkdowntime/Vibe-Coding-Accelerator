import express from 'express';
import { 
  getProjectFiles,
  getFileById,
  getFileContent,
  uploadFiles,
  deleteFileById,
  downloadFile,
  uploadMiddleware
} from '../controllers/filesController.js';
import { 
  validateProjectId,
  validateFileId,
  validateFileUpload
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Files Routes for Project File Management
 * All routes are prefixed with /api/v1/files
 */

/**
 * @route   GET /api/v1/files/projects/:projectId
 * @desc    Get all files for a project
 * @access  Public (will be protected with auth later)
 * @params  {string} projectId - Project UUID
 * @query   {number} page - Page number for pagination (default: 1)
 * @query   {number} limit - Items per page (default: 20)
 */
router.get(
  '/projects/:projectId',
  validateProjectId,
  asyncHandler(getProjectFiles)
);

/**
 * @route   GET /api/v1/files/projects/:projectId/:fileId
 * @desc    Get file metadata by ID
 * @access  Public (will be protected with auth later)
 * @params  {string} projectId - Project UUID
 * @params  {string} fileId - File identifier
 */
router.get(
  '/projects/:projectId/:fileId',
  validateProjectId,
  validateFileId,
  asyncHandler(getFileById)
);

/**
 * @route   GET /api/v1/files/projects/:projectId/:fileId/content
 * @desc    Get file content
 * @access  Public (will be protected with auth later)
 * @params  {string} projectId - Project UUID
 * @params  {string} fileId - File identifier
 */
router.get(
  '/projects/:projectId/:fileId/content',
  validateProjectId,
  validateFileId,
  asyncHandler(getFileContent)
);

/**
 * @route   GET /api/v1/files/projects/:projectId/:fileId/download
 * @desc    Download file
 * @access  Public (will be protected with auth later)
 * @params  {string} projectId - Project UUID
 * @params  {string} fileId - File identifier
 */
router.get(
  '/projects/:projectId/:fileId/download',
  validateProjectId,
  validateFileId,
  asyncHandler(downloadFile)
);

/**
 * @route   POST /api/v1/files/projects/:projectId/upload
 * @desc    Upload files to project
 * @access  Public (will be protected with auth later)
 * @params  {string} projectId - Project UUID
 * @body    {files} files - Files to upload (multipart/form-data)
 * @body    {string} description - Optional description for uploaded files
 */
router.post(
  '/projects/:projectId/upload',
  validateProjectId,
  uploadMiddleware.array('files', 10), // Max 10 files per upload
  validateFileUpload,
  asyncHandler(uploadFiles)
);

/**
 * @route   DELETE /api/v1/files/projects/:projectId/:fileId
 * @desc    Delete file by ID
 * @access  Public (will be protected with auth later)
 * @params  {string} projectId - Project UUID
 * @params  {string} fileId - File identifier
 */
router.delete(
  '/projects/:projectId/:fileId',
  validateProjectId,
  validateFileId,
  asyncHandler(deleteFileById)
);

export default router;
