# ADR-003: Asynchronous LLM Processing with Progress Feedback

**Context:**  
LLM processing may be slow or fail; users need feedback and control.

**Decision:**  
All LLM interactions are asynchronous, with a progress bar and retry/cancel options for failures.

**Consequences:**  
- Improved UX
- Easier error recovery
