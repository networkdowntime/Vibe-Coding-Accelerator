import express from 'express';
import agentsController from '../controllers/agentsController.js';

const router = express.Router();

/**
 * Routes for AI agents and tech stack management
 */

/**
 * @route GET /api/v1/agents
 * @desc Get all available AI agents
 * @access Public
 */
router.get('/', agentsController.getAvailableAgents);

/**
 * @route GET /api/v1/agents/techstack
 * @desc Get available tech stack options
 * @access Public
 */
router.get('/techstack', agentsController.getTechStackOptions);

/**
 * @route GET /api/v1/agents/projects/:projectId/selection
 * @desc Get saved tech stack and agent selection for a project
 * @access Public
 */
router.get('/projects/:projectId/selection', agentsController.getTechStackSelection);

/**
 * @route POST /api/v1/agents/projects/:projectId/selection
 * @desc Save tech stack and agent selection for a project
 * @access Public
 */
router.post('/projects/:projectId/selection', agentsController.saveTechStackSelection);

export default router;
