const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Project CRUD routes
router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.put('/:projectName', projectController.renameProject);
router.delete('/:projectName', projectController.deleteProject);

module.exports = router;
