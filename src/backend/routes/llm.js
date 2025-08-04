const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');

// Start LLM processing for a project
router.post('/process/:projectId', llmController.startProcessing);

// Get processing status
router.get('/status/:jobId', llmController.getStatus);

// Cancel processing
router.post('/cancel/:jobId', llmController.cancelProcessing);

// Retry failed processing from specific step
router.post('/retry/:jobId', llmController.retryProcessing);

// Get processed files
router.get('/results/:jobId', llmController.getResults);

module.exports = router;
