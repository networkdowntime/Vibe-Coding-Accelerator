import express from 'express';
import llmController from '../controllers/llmController.js';

const router = express.Router();

/**
 * @swagger
 * /api/llm/process:
 *   post:
 *     summary: Start LLM processing for project files
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - fileIds
 *               - aiAgentConfig
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: ID of the project containing files to process
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of file IDs to process
 *               aiAgentConfig:
 *                 type: object
 *                 description: AI agent configuration object
 *     responses:
 *       200:
 *         description: Processing started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobId:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     progress:
 *                       type: number
 *                     totalFiles:
 *                       type: number
 *       400:
 *         description: Bad request - missing required fields or LLM not configured
 *       500:
 *         description: Internal server error
 */
router.post('/process', llmController.processFiles);

/**
 * @swagger
 * /api/llm/status/{jobId}:
 *   get:
 *     summary: Get LLM processing status
 *     tags: [LLM]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Processing job ID
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [starting, processing, completed, completed_with_errors, error, cancelled]
 *                     progress:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     totalFiles:
 *                       type: number
 *                     processedFiles:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.get('/status/:jobId', llmController.getProcessingStatus);

/**
 * @swagger
 * /api/llm/cancel/{jobId}:
 *   post:
 *     summary: Cancel LLM processing
 *     tags: [LLM]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Processing job ID to cancel
 *     responses:
 *       200:
 *         description: Processing cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Cannot cancel job (already completed or failed)
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.post('/cancel/:jobId', llmController.cancelProcessing);

export default router;
