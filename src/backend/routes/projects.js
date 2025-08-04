import express from 'express';
import { 
  getAllProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject 
} from '../controllers/projectsController.js';
import { validate, schemas } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @route GET /api/v1/projects
 * @description Get all projects with pagination and filtering
 * @access Public
 */
router.get('/', 
  validate(schemas.listProjects),
  asyncHandler(getAllProjects)
);

/**
 * @route GET /api/v1/projects/:id
 * @description Get project by ID
 * @access Public
 */
router.get('/:id', 
  validate(schemas.getProject),
  asyncHandler(getProjectById)
);

/**
 * @route POST /api/v1/projects
 * @description Create new project
 * @access Public
 */
router.post('/', 
  validate(schemas.createProject),
  asyncHandler(createProject)
);

/**
 * @route PUT /api/v1/projects/:id
 * @description Update project by ID
 * @access Public
 */
router.put('/:id', 
  validate(schemas.updateProject),
  asyncHandler(updateProject)
);

/**
 * @route DELETE /api/v1/projects/:id
 * @description Delete project by ID
 * @access Public
 */
router.delete('/:id', 
  validate(schemas.deleteProject),
  asyncHandler(deleteProject)
);

export default router;
