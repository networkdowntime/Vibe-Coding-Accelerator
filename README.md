# Vibe Coding Accelerator

A desktop-first, local-first tool to accelerate project setup and AI agent configuration, ensuring best practices and standards compliance for every project. This is a full-stack application with an Angular frontend and Node.js backend that manages projects, AI agent configurations, and LLM processing workflows.

## Features

- **Project Management**: Create, view, edit, and delete development projects with file upload/download capabilities
- **AI Agent & Tech Stack Selection**: Support for different AI platforms (ChatGPT, Claude, GitHub Copilot) with customizable instruction sets
- **File/Document Management**: Upload, manage, and organize project files and documentation
- **LLM-Powered Processing**: Asynchronous processing of projects through various LLM providers with progress tracking
- **Consistency Checks**: Validate project configurations and documentation for compliance
- **Traceability Reporting**: Generate comprehensive reports across project documentation and implementation
- **OpenAPI Integration**: Manage and configure OpenAPI endpoints for external integrations

## Architecture

- **Frontend**: Angular 20.1.0 with TypeScript, Angular Material UI
- **Backend**: Node.js with Express server, REST API endpoints
- **Data Storage**: Local filesystem-based storage for projects and configurations
- **Development**: Proxy configuration for seamless frontend-backend integration

## Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Angular CLI**: Install globally with `npm install -g @angular/cli`

Verify your installations:
```bash
node --version    # Should be 18+
npm --version     # Should be 8+
ng version        # Should show Angular CLI 20+
```

## Getting Started

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd vibe-coding-accelerator
   ```

2. **Install root dependencies**:
   ```bash
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd src/frontend
   npm install
   cd ../..
   ```

4. **Install backend dependencies**:
   ```bash
   cd src/backend
   npm install
   cd ../..
   ```

### Running the Application

**Quick Start (Recommended)**:
```bash
npm run start
```
This runs both frontend and backend with proper proxy configuration.

**Manual Setup**:

Terminal 1 - Backend:
```bash
cd src/backend
npm start          # Production mode
# OR
npm run dev        # Development mode with auto-restart
```

Terminal 2 - Frontend:
```bash
cd src/frontend
ng serve
```

### Accessing the Application

- **Main Application**: http://localhost:4200
- **Backend API**: http://localhost:3001/api

The frontend automatically proxies all `/api/**` requests to the backend server.

## Testing

```bash
# Run all tests (frontend + backend)
npm test

# Frontend tests only
cd src/frontend && npm test

# Backend tests only  
cd src/backend && npm test

# With coverage
npm run test:coverage
```

**Current Test Status**: ✅ 210/210 tests passing (174 frontend + 36 backend)

## Directory Structure

```
vibe-coding-accelerator/
├── src/                           # Application source code
│   ├── frontend/                  # Angular frontend (port 4200)
│   │   ├── src/app/              # Components, services, routing
│   │   ├── proxy.conf.json       # API proxy configuration
│   │   └── package.json          # Frontend dependencies
│   └── backend/                   # Node.js backend (port 3001)
│       ├── server.js             # Main server file
│       ├── routes/               # API endpoints
│       ├── controllers/          # Request handlers
│       └── package.json          # Backend dependencies
├── docs/                          # Project documentation
│   ├── architecture-decisions/   # Architecture Decision Records (ADRs)
│   ├── product-requirements/     # Product Requirements Documents (PRDs)
│   ├── business-requirements.md  # Business Requirements Document
│   ├── system-architecture.md    # System Architecture Documentation
│   └── high-level-spec.md        # High-Level Technical Specification
├── projects/                      # User-created projects storage
├── ai_agents/                     # AI agent configurations and instructions
├── system-requirements/           # System Requirements Documents (SRDs)
├── tasks/                         # Implementation task breakdowns
└── package.json                   # Root configuration and scripts
```

## Available Scripts

### Root Level
- `npm start` - Start both frontend and backend concurrently
- `npm test` - Run all tests (frontend + backend)
- `npm run test:frontend` - Run frontend tests only
- `npm run test:backend` - Run backend tests only

### Frontend (`src/frontend/`)
- `ng serve` - Start development server (port 4200)
- `ng build` - Build for production
- `ng test` - Run unit tests with Karma
- `ng e2e` - Run end-to-end tests

### Backend (`src/backend/`)
- `npm start` - Start production server (port 3001)
- `npm run dev` - Start with nodemon auto-restart
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode

## Development Workflow

1. **Start development environment**: `npm run start`
2. **Make code changes** in either frontend (`src/frontend/`) or backend (`src/backend/`)
3. **Run tests**: `npm test` to ensure everything works
4. **Access application**: http://localhost:4200

The development setup includes:
- Frontend hot-reload on file changes
- Backend auto-restart with nodemon
- Proxy configuration for seamless API integration
- Comprehensive test coverage

## Troubleshooting

### Common Issues

**Port conflicts**:
```bash
# Kill processes on ports 3001 or 4200
lsof -ti:3001 | xargs kill -9
lsof -ti:4200 | xargs kill -9
```

**Dependency issues**:
```bash
# Clean reinstall
rm -rf node_modules src/frontend/node_modules src/backend/node_modules
npm install
cd src/frontend && npm install && cd ../..
cd src/backend && npm install && cd ../..
```

**Angular CLI missing**:
```bash
npm install -g @angular/cli
```

### Development Tips

- Use `npm run start` for the best development experience
- Check browser console and terminal for error messages
- Backend API calls are logged in the terminal
- Frontend uses Angular DevTools for debugging
- All tests should pass before committing changes

## Documentation

- **Requirements**: See `docs/product-requirements/` for PRDs and `docs/business-requirements.md`
- **Architecture**: See `docs/architecture-decisions/` for ADRs and `docs/system-architecture.md`
- **System Design**: See `system-requirements/` for SRDs and `docs/high-level-spec.md`
- **Implementation**: See `tasks/` for development progress
- **AI Instructions**: See `ai_agents/` for coding standards

## Contributing

1. Follow the coding standards in `/ai_agents/githubCopilot/instructions/`
2. Run tests before submitting: `npm test`
3. Ensure both frontend (174) and backend (36) tests pass
4. Update documentation as needed

## License

[License information to be added]
