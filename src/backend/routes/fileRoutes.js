const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// File management routes for projects
router.get('/:projectName/files', fileController.listFiles);
router.post('/:projectName/files', fileController.uploadFile);
router.get('/:projectName/files/:fileName', fileController.getFile);
router.put('/:projectName/files/:fileName', fileController.renameFile);
router.delete('/:projectName/files/:fileName', fileController.deleteFile);

module.exports = router;
