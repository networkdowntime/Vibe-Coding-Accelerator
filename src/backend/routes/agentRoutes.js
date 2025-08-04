const express = require('express');
const agentsController = require('../controllers/agentsController');

const router = express.Router();

// Get all available AI agents
router.get('/agents', agentsController.getAgents);

// Get tech stack options for a specific agent
router.get('/agents/:agentName/tech-stacks', agentsController.getTechStacks);

// Save tech stack selection to project
router.post('/:projectName/tech-stack', agentsController.saveTechStack);

// Get tech stack for a project
router.get('/:projectName/tech-stack', agentsController.getTechStack);

module.exports = router;
