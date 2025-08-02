# Task 0004: Implement Project CRUD APIs

## Context
**Related SRD**: `srd-main.md` (section 2)
**Related PRD User Story**: Project Management - Create, View, Edit, Delete Project
**System**: Vibe Coding Accelerator
**Component**: Node.js Backend (API)

## Objective
Implement REST API endpoints for creating, viewing, renaming, and deleting projects, with all operations reflected in the local filesystem.

## Acceptance Criteria
- [ ] API endpoints for create, list, rename, and delete project
- [ ] Duplicate project names (case-insensitive, camel-case) are prevented
- [ ] Project directories are created/renamed/deleted on disk as specified
- [ ] Deleted projects are renamed with `.deleted` extension
- [ ] All operations return appropriate status and error messages
- [ ] Unit tests for all endpoints

## Technical Requirements
### Implementation Details
- Use Express.js routes/controllers
- Validate project names for uniqueness and format
- Implement file system operations for project directories
- Return high-level errors in API, detailed errors in logs

### File Changes Expected
- `src/backend/routes/projects.js` - Project API routes
- `src/backend/controllers/projectsController.js` - Logic for CRUD
- `src/backend/utils/` - Helper functions for filesystem ops
- `tests/unit/projects.test.js` - Unit tests

### Database Changes (if applicable)
- None
