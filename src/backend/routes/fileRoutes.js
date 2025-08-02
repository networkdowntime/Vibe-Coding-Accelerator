const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// File management endpoints (scaffold only)
router.get('/:projectId', fileController.listFiles);
router.post('/:projectId', fileController.uploadFile);
router.delete('/:projectId/:fileName', fileController.deleteFile);
router.put('/:projectId/:fileName', fileController.renameFile);

module.exports = router;
