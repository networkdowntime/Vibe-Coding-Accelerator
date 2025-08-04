# Task 0004: Implement Project CRUD APIs

## Context
**Related SRD**: `srd-main.md` (section 2)
**Related PRD User Story**: Project Management - Create, View, Edit, Delete Project
**System**: Vibe Coding Accelerator
**Component**: Node.js Backend (API)

## Objective
Implement REST API endpoints for creating, viewing, renaming, and deleting projects, with all operations reflected in the local filesystem.

## Acceptance Criteria
- [x] API endpoints for create, list, rename, and delete project
- [x] Duplicate project names (case-insensitive, camel-case) are prevented
- [x] Project directories are created/renamed/deleted on disk as specified
- [x] Deleted projects are renamed with `.deleted` extension
- [x] All operations return appropriate status and error messages
- [x] Unit tests for all endpoints

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

## Testing Requirements
- [x] Unit tests for all endpoints
- [x] Manual testing steps (if applicable)

## Dependencies
**Prerequisite Tasks**: 
- [x] Task 0003: Initialize Node.js Backend

**Blocking Tasks** (tasks that depend on this one):
- Task 0005+: Frontend components that consume these APIs

## Definition of Done
- [x] Code implemented according to acceptance criteria
- [x] All tests passing (unit and integration)
- [x] Code reviewed (if team workflow requires)
- [x] Documentation updated (inline comments, README changes)
- [x] No regression in existing functionality

## Implementation Summary (COMPLETED)

**Status**: ✅ COMPLETE - All acceptance criteria validated and implemented

**Files Implemented**:
- ✅ `src/backend/controllers/projectController.js` - Complete CRUD operations for projects
- ✅ `src/backend/routes/projectRoutes.js` - Express routes for project API endpoints
- ✅ `src/backend/utils/stringUtils.js` - Utility functions for camelCase conversion and readable names
- ✅ `tests/unit/projects.test.js` - Comprehensive unit tests for all operations
- ✅ `src/backend/server.js` - Updated to include project routes

**Functionality Validated**:
- ✅ **CREATE**: POST /api/projects - Creates project with unique camelCase name
- ✅ **READ**: GET /api/projects - Lists all non-deleted projects sorted by creation time
- ✅ **UPDATE**: PUT /api/projects/:projectName - Renames project with collision prevention
- ✅ **DELETE**: DELETE /api/projects/:projectName - Soft delete with .deleted extension
- ✅ **Duplicate Prevention**: Case-insensitive camelCase name checking
- ✅ **Filesystem Operations**: Directory creation, renaming, and soft deletion
- ✅ **Error Handling**: Proper HTTP status codes and error messages
- ✅ **Test Coverage**: All endpoints tested with 13 passing tests total

**Technical Implementation**:
- Express.js REST API with proper HTTP methods
- Filesystem-based project storage in `./projects` directory
- CamelCase naming convention with readable display names
- Comprehensive error handling with appropriate status codes
- No authentication required as per SRD specifications
- Project structure includes `docs/` and `configs/` subdirectories