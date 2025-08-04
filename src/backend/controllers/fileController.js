const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PROJECTS_DIR = path.resolve(__dirname, '../../../projects');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectName = req.params.projectName;
    const filesDir = path.join(PROJECTS_DIR, projectName, 'files');
    
    // Ensure files directory exists
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    // Use original filename
    cb(null, file.originalname);
  }
});

// Supported file types for document management
const SUPPORTED_TYPES = ['.txt', '.md', '.yml', '.yaml', '.html', '.pdf'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_TYPES.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type. Supported types: ${SUPPORTED_TYPES.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const fileController = {
  // List all files in a project
  listFiles: (req, res) => {
    try {
      const { projectName } = req.params;
      const projectPath = path.join(PROJECTS_DIR, projectName);
      const filesDir = path.join(projectPath, 'files');

      // Check if project exists
      if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // If files directory doesn't exist, return empty array
      if (!fs.existsSync(filesDir)) {
        return res.json([]);
      }

      const files = fs.readdirSync(filesDir)
        .filter(fileName => {
          const ext = path.extname(fileName).toLowerCase();
          return SUPPORTED_TYPES.includes(ext);
        })
        .map(fileName => {
          const filePath = path.join(filesDir, fileName);
          const stats = fs.statSync(filePath);
          return {
            name: fileName,
            size: stats.size,
            type: path.extname(fileName).toLowerCase(),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  },

  // Upload a file to a project
  uploadFile: [
    upload.single('file'),
    (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const { projectName } = req.params;
        const projectPath = path.join(PROJECTS_DIR, projectName);

        // Check if project exists
        if (!fs.existsSync(projectPath)) {
          return res.status(404).json({ error: 'Project not found' });
        }

        res.status(201).json({
          name: req.file.filename,
          size: req.file.size,
          type: path.extname(req.file.filename).toLowerCase(),
          message: 'File uploaded successfully'
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
      }
    }
  ],

  // Get a specific file (serve file content)
  getFile: (req, res) => {
    try {
      const { projectName, fileName } = req.params;
      const filePath = path.join(PROJECTS_DIR, projectName, 'files', fileName);

      // Check if project and file exist
      if (!fs.existsSync(path.join(PROJECTS_DIR, projectName))) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file type is supported
      const ext = path.extname(fileName).toLowerCase();
      if (!SUPPORTED_TYPES.includes(ext)) {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      // Set appropriate content type
      const contentTypes = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.yml': 'text/yaml',
        '.yaml': 'text/yaml',
        '.html': 'text/html',
        '.pdf': 'application/pdf'
      };

      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({ error: 'Failed to retrieve file' });
    }
  },

  // Rename a file
  renameFile: (req, res) => {
    try {
      const { projectName, fileName } = req.params;
      const { newName } = req.body;

      if (!newName || newName.trim() === '') {
        return res.status(400).json({ error: 'New file name is required' });
      }

      const projectPath = path.join(PROJECTS_DIR, projectName);
      const filesDir = path.join(projectPath, 'files');
      const oldPath = path.join(filesDir, fileName);
      const newPath = path.join(filesDir, newName);

      // Check if project exists
      if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if file exists
      if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if target file already exists
      if (fs.existsSync(newPath)) {
        return res.status(409).json({ error: 'File with new name already exists' });
      }

      // Check if new file type is supported
      const ext = path.extname(newName).toLowerCase();
      if (!SUPPORTED_TYPES.includes(ext)) {
        return res.status(400).json({ error: `Unsupported file type. Supported types: ${SUPPORTED_TYPES.join(', ')}` });
      }

      // Rename file
      fs.renameSync(oldPath, newPath);

      res.json({
        oldName: fileName,
        newName: newName,
        message: 'File renamed successfully'
      });
    } catch (error) {
      console.error('Error renaming file:', error);
      res.status(500).json({ error: 'Failed to rename file' });
    }
  },

  // Delete a file
  deleteFile: (req, res) => {
    try {
      const { projectName, fileName } = req.params;
      const filePath = path.join(PROJECTS_DIR, projectName, 'files', fileName);

      // Check if project exists
      if (!fs.existsSync(path.join(PROJECTS_DIR, projectName))) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete file
      fs.unlinkSync(filePath);

      res.json({
        name: fileName,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
};

module.exports = fileController;
