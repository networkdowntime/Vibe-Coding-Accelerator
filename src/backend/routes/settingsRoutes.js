const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Get current OpenAPI settings
router.get('/openapi', settingsController.getOpenApiSettings);

// Update OpenAPI settings
router.put('/openapi', settingsController.updateOpenApiSettings);

// Test OpenAPI connectivity
router.post('/openapi/test', settingsController.testOpenApiConnection);

module.exports = router;
