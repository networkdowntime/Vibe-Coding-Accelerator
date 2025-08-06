import express from 'express';
import settingsController from '../controllers/settingsController.js';

const router = express.Router();

/**
 * Routes for application settings management
 */

/**
 * @route GET /api/v1/settings
 * @desc Get current application settings
 * @access Public
 */
router.get('/', settingsController.getSettings);

/**
 * @route PUT /api/v1/settings
 * @desc Update application settings
 * @access Public
 */
router.put('/', settingsController.updateSettings);

/**
 * @route POST /api/v1/settings/test-llm
 * @desc Test LLM endpoint connectivity
 * @access Public
 */
router.post('/test-llm', settingsController.testLLMConnection);

export default router;
