const express = require('express');
const router = express.Router();
const traceabilityController = require('../controllers/traceabilityController');

// Generate traceability report for a completed job
router.get('/report/:jobId', traceabilityController.generateReport);

// Get traceability report (if already generated)
router.get('/report/:jobId/content', traceabilityController.getReport);

// Download traceability report as Markdown
router.get('/report/:jobId/download', traceabilityController.downloadReport);

// Trigger consistency check for export files
router.post('/consistency/:jobId', traceabilityController.performConsistencyCheck);

module.exports = router;
