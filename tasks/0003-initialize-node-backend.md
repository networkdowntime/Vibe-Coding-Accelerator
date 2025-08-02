# Task 0003: Initialize Node.js Backend

## Context
**Related SRD**: `srd-main.md` (section 2, 3)
**Related PRD User Story**: Project Management - Project CRUD, File Management
**System**: Vibe Coding Accelerator
**Component**: Node.js Backend

## Objective
Set up the Node.js backend with Express (or similar), initial API endpoints, and local file operations support.

## Acceptance Criteria
- [x] Node.js backend is initialized in `src/`
- [x] Express server runs locally
- [x] API endpoints for project CRUD and file management are scaffolded
- [x] Backend can read/write to local filesystem (projects, ai_agents)
- [x] API is accessible from Angular frontend

## Technical Requirements
### Implementation Details
- Use Node.js 18+, Express.js
- Scaffold endpoints for project CRUD, file upload, file listing
- Implement local file operations (no DB)
- Enable CORS for frontend

### File Changes Expected
- `src/backend/` - Node.js backend scaffold
- `src/backend/routes/` - API routes
- `src/backend/controllers/` - Controllers

### Database Changes (if applicable)
- None
