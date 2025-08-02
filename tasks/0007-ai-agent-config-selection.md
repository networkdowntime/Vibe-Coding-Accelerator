# Task 0007: Implement AI Agent and Tech Stack Selection

## Context
**Related SRD**: `srd-main.md` (section 2)
**Related PRD User Story**: AI Agent Configuration - Select AI Agent, Tech Stack Selection
**System**: Vibe Coding Accelerator
**Component**: Angular Frontend, Node.js Backend

## Objective
Enable users to select an AI agent and tech stack for their project, dynamically loading options from the filesystem and saving selections.

## Acceptance Criteria
- [ ] User can select from available AI agents (from `ai_agents` subdirectories)
- [ ] Tech stack autocomplete is populated from files in `ai_agents/<agent>/instructions`
- [ ] Adding a new file in the directory adds it as an option
- [ ] User can add/remove tech stack elements (displayed as chips)
- [ ] Tech stack selection is saved to `techstack.txt` in the project directory
- [ ] Unit/integration tests for backend and frontend

## Technical Requirements
### Implementation Details
- Backend: Endpoint to list AI agents and tech stack files
- Frontend: Angular components/services for selection UI
- Watch filesystem for changes (or refresh on demand)

### File Changes Expected
- `src/backend/routes/agents.js` - API for agents/tech stack
- `src/backend/controllers/agentsController.js` - Logic
- `src/app/components/agent-select/` - Agent/tech stack UI
- `src/app/services/agent.service.ts` - API integration
- `tests/unit/agents.test.js` - Backend tests
- `tests/unit/agent-select.component.spec.ts` - Frontend tests

### Database Changes (if applicable)
- None
