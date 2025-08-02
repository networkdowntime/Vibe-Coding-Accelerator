const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// CRUD endpoints (scaffold only)
router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
