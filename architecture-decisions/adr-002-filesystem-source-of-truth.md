# ADR-002: Filesystem as Source of Truth

**Context:**  
Users and admins may add new tech stack files or AI agents via the filesystem.

**Decision:**  
The backend dynamically reads the filesystem to populate available tech stacks and agents, and to gather all relevant files for LLM submission.

**Consequences:**  
- No need for UI-based tech stack/agent management
- Simple extensibility for new stacks/agents
