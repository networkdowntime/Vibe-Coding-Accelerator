# AI Code Analysis Backend

This is the Node.js/Express.js backend for the AI-powered code analysis platform.

## Features

- **Project Management**: CRUD operations for projects
- **File Management**: Upload, download, and manage project files
- **Health Monitoring**: Comprehensive health checks and system monitoring
- **Security**: Rate limiting, CORS, input validation, and security headers
- **Error Handling**: Centralized error handling with detailed logging
- **File Operations**: Safe file system operations with path traversal protection

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the backend directory:
   ```bash
   cd src/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.template .env
   ```

4. Update the `.env` file with your configuration

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on http://localhost:3001

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system health information

### Projects
- `GET /api/projects` - Get all projects (with pagination)
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Files
- `GET /api/projects/:projectId/files` - Get all files for a project
- `GET /api/projects/:projectId/files/:fileId` - Get file metadata
- `GET /api/projects/:projectId/files/:fileId/content` - Get file content
- `GET /api/projects/:projectId/files/:fileId/download` - Download file
- `POST /api/projects/:projectId/files/upload` - Upload files
- `DELETE /api/projects/:projectId/files/:fileId` - Delete file

## Project Structure

```
src/backend/
├── controllers/          # Request handlers
│   ├── projectsController.js
│   └── filesController.js
├── middleware/           # Express middleware
│   ├── errorHandler.js
│   ├── requestLogger.js
│   └── validation.js
├── routes/              # API routes
│   ├── health.js
│   ├── projects.js
│   └── files.js
├── utils/               # Utility functions
│   ├── fileSystem.js
│   └── helpers.js
├── server.js            # Main application file
├── package.json         # Dependencies and scripts
└── .env                 # Environment configuration
```

## Configuration

The application uses environment variables for configuration. See `.env.template` for all available options.

Key configuration options:
- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:4200)
- `PROJECT_STORAGE_PATH`: Directory for storing project files (default: ./projects)
- `MAX_FILE_SIZE`: Maximum file upload size in bytes (default: 50MB)

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests (when implemented)
- `npm run lint` - Run ESLint (when configured)

### Code Style

The project follows standard JavaScript/Node.js conventions:
- ES6+ modules (import/export)
- Async/await for asynchronous operations
- Comprehensive error handling
- Input validation with Joi
- Security-first approach

## Security Features

- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **CORS**: Properly configured CORS for frontend integration
- **Input Validation**: Joi schemas for request validation
- **Security Headers**: Helmet.js for security headers
- **File Upload Security**: File type validation and size limits
- **Path Traversal Protection**: Safe file operations with path validation

## Error Handling

The application includes comprehensive error handling:
- Global error middleware
- Custom error classes
- Detailed error logging
- User-friendly error responses
- Development vs production error modes

## Monitoring

Health check endpoints provide:
- System uptime
- Memory usage
- CPU information
- Disk space
- API response times
- Database connectivity (when implemented)

## Future Enhancements

- Authentication and authorization
- Database integration
- Caching layer
- API documentation with Swagger
- Unit and integration tests
- Docker containerization
- CI/CD pipeline integration
