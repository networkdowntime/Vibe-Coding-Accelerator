# Task 0010: Implement LLM Consistency Check and Traceability Report

## Context
**Related SRD**: `srd-main.md` (section 2, 5, 6)
**Related PRD User Story**: Traceability & Reporting - Generate Traceability Report, LLM Post-Processing
**System**: Vibe Coding Accelerator
**Component**: Node.js Backend, Angular Frontend

## Objective
After initial config generation, submit all export files to the LLM for a consistency check, then generate and display a Markdown traceability report in the browser.

## Acceptance Criteria
- [ ] All export files are submitted to LLM for consistency check after initial processing
- [ ] LLM returns corrected files (if needed), which overwrite originals
- [ ] Traceability report is generated in Markdown, viewable in browser
- [ ] Report shows requirements sources, gaps, and completeness score
- [ ] User can download the report as Markdown
- [ ] Unit/integration tests for backend and frontend

## Technical Requirements
### Implementation Details
- Backend: LLM API call for consistency check, report generation logic
- Frontend: Markdown viewer, download option
- Ensure all diagrams in report use Mermaid syntax

### File Changes Expected
- `src/backend/routes/traceability.js` - Traceability API
- `src/backend/controllers/traceabilityController.js` - Logic
- `src/app/components/traceability-report/` - Report viewer UI
- `src/app/services/traceability.service.ts` - API integration
- `tests/unit/traceability.test.js` - Backend tests
- `tests/unit/traceability-report.component.spec.ts` - Frontend tests

### Database Changes (if applicable)
- None
