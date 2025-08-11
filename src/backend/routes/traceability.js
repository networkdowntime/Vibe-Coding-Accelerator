import express from 'express';

import traceabilityController from '../controllers/traceabilityController.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route POST /api/v1/traceability/consistency-check
 * @desc Start consistency check on processed files
 * @access Public
 * @body { projectId: string, jobId?: string }
 */
router.post('/consistency-check',
  validate(schemas.consistencyCheck),
  traceabilityController.performConsistencyCheck
);

/**
 * @route GET /api/v1/traceability/consistency-check/:consistencyJobId/status
 * @desc Get consistency check status
 * @access Public
 * @params { consistencyJobId: string }
 */
router.get('/consistency-check/:consistencyJobId/status',
  validate(schemas.consistencyCheckStatus),
  traceabilityController.getConsistencyCheckStatus
);

/**
 * @route POST /api/v1/traceability/reports/:projectId/generate
 * @desc Generate traceability report for a project
 * @access Public
 * @params { projectId: string }
 */
router.post('/reports/:projectId/generate',
  validate(schemas.generateTraceabilityReport),
  traceabilityController.generateTraceabilityReport
);

/**
 * @route GET /api/v1/traceability/reports/:projectId
 * @desc Get traceability report content
 * @access Public
 * @params { projectId: string }
 */
router.get('/reports/:projectId',
  validate(schemas.getTraceabilityReport),
  traceabilityController.getTraceabilityReport
);

/**
 * @route GET /api/v1/traceability/reports/:projectId/download
 * @desc Download traceability report as Markdown file
 * @access Public
 * @params { projectId: string }
 */
router.get('/reports/:projectId/download',
  validate(schemas.getTraceabilityReport),
  traceabilityController.downloadTraceabilityReport
);

export default router;
