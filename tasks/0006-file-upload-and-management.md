# Task 0006: Implement File Upload and Management

## Context
**Related SRD**: `srd-main.md` (section 2)
**Related PRD User Story**: Document Management - Upload, View, Delete, Rename Documents
**System**: Vibe Coding Accelerator
**Component**: Node.js Backend, Angular Frontend

## Objective
Enable file upload, viewing, deletion, and renaming for supported file types within each project, with UI and API integration.

## Acceptance Criteria
- [ ] User can upload files (txt, md, yml, html, pdf) to project
- [ ] Uploaded files are stored in the project's `files` subdirectory
- [ ] User can view supported files in browser
- [ ] User can delete or rename files (with confirmation/collision prevention)
- [ ] UI updates immediately on changes
- [ ] Unit/integration tests for backend and frontend

## Technical Requirements
### Implementation Details
- Backend: Express endpoints for file upload, list, delete, rename
- Frontend: Angular components/services for file management
- Use modals for confirmations/errors
- Validate file types/extensions on upload

### File Changes Expected
- `src/backend/routes/files.js` - File API routes
- `src/backend/controllers/filesController.js` - File logic
- `src/app/components/file-list/` - File tile/list component
- `src/app/services/file.service.ts` - API integration
- `tests/unit/files.test.js` - Backend tests
- `tests/unit/file-list.component.spec.ts` - Frontend tests

### Database Changes (if applicable)
- None
