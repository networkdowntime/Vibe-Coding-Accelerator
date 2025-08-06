# Task 0008: Implement OpenAPI Endpoint & API Key Management

## Context
**Related SRD**: `srd-main.md` (section 2, 4)
**Related PRD User Story**: OpenAPI Endpoint & API Key Management - Set/Edit Endpoint, Test Access
**System**: Vibe Coding Accelerator
**Component**: Angular Frontend, Node.js Backend

## Objective
Allow users to set, edit, and test the OpenAPI endpoint and API key for LLM access, storing values in `.env` and validating connectivity.

## Acceptance Criteria
- [x] User is prompted for endpoint and API key on first use
- [x] Values are stored in `.env` file
- [x] User can edit values via settings
- [x] "Test Access" button validates endpoint and API key
- [x] User receives modal feedback on success/failure
- [x] Detailed errors are logged to the console
- [x] Unit/integration tests for backend and frontend

## Technical Requirements
### Implementation Details
- Backend: Read/write `.env`, endpoint to test LLM connectivity
- Frontend: Angular components/services for settings UI
- Use modals for feedback

### File Changes Expected
- `src/backend/routes/settings.js` - API for settings
- `src/backend/controllers/settingsController.js` - Logic
- `src/app/components/settings/` - Settings UI
- `src/app/services/settings.service.ts` - API integration
- `tests/unit/settings.test.js` - Backend tests
- `tests/unit/settings.component.spec.ts` - Frontend tests

### Database Changes (if applicable)
- None
