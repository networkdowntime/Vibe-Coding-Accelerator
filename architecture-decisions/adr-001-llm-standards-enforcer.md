# ADR-001: LLM as Consistency and Standards Enforcer

**Context:**  
Manual config generation is error-prone and inconsistent. We need a way to unify project-specific requirements with tech stack best practices, and ensure all outputs are consistent.

**Decision:**  
All config/instruction files are generated and post-processed by the LLM, using a prompt that prioritizes project documents, then tech stack files, and enforces Mermaid syntax for diagrams.

**Consequences:**  
- Ensures high-quality, standards-compliant outputs
- Reduces manual review effort
- Requires robust prompt engineering and error handling
