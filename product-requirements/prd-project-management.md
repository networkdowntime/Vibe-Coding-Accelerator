# Product Requirements Document (PRD)
**Feature Domain:** Project Management
**Project:** Vibe Coding Accelerator
**Date:** August 2, 2025

---

## 1. Overview
This PRD covers all requirements for project creation, viewing, editing, renaming, and deletion within the Vibe Coding Accelerator desktop application.

---

## 2. User Stories

### User Story: Create Project
**As a** user
**I want** to create a new project with a unique name
**So that** I can manage AI Agent configurations for my work

#### Acceptance Criteria
- [x] User can create a project by entering a name (API/backend)
- [x] Duplicate project names (case-insensitive, camel-case) are not allowed (API/backend)
- [x] Project directory is created in `./projects` using lowercase camel case (API/backend)
- [ ] Project appears as a tile in the main UI
- [ ] Project creation is confirmed via modal

#### Definition of Done
- [x] Code implemented (API/backend)
- [x] Unit tests written (API/backend)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Security review completed

---

### User Story: View Projects
**As a** user
**I want** to see a sortable and searchable tile view of all projects
**So that** I can quickly find and access my work

#### Acceptance Criteria
- [ ] Main UI displays all non-deleted projects as tiles
- [ ] Projects are ordered by creation time (most recent first) by default
- [ ] User can sort alphabetically
- [ ] User can search projects by name
- [ ] Deleted projects (with `.deleted` extension) are not shown

#### Definition of Done
- [ ] Code implemented
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Security review completed

---

### User Story: Edit Project Name
**As a** user
**I want** to rename a project
**So that** I can keep my project names accurate and meaningful

#### Acceptance Criteria
- [x] User can rename a project (API/backend)
- [x] If the new name collides with an existing project, user is warned and rename is prevented (API/backend)
- [x] Project directory is renamed accordingly (API/backend)
- [ ] All references and UI elements update to reflect the new name
- [ ] Rename is confirmed via modal

#### Definition of Done
- [x] Code implemented (API/backend)
- [x] Unit tests written (API/backend)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Security review completed

---

### User Story: Delete Project
**As a** user
**I want** to delete a project
**So that** I can remove projects I no longer need

#### Acceptance Criteria
- [x] User can delete a project (API/backend)
- [x] Project directory is renamed to add `.deleted` extension (not removed from disk) (API/backend)
- [ ] User can delete a project from the main UI or project view/edit page
- [ ] Deletion requires confirmation via modal
- [ ] Deleted project is immediately removed from the UI
- [ ] User is redirected to the main page if deleting from the project view/edit page

#### Definition of Done
- [x] Code implemented (API/backend)
- [x] Unit tests written (API/backend)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Security review completed

---

### User Story: Project Tile UI
**As a** user
**I want** a clear, interactive tile for each project
**So that** I can easily access, edit, or delete projects

#### Acceptance Criteria
- [ ] Each tile displays the project name (exploded camel-case, capitalized)
- [ ] Each tile has a delete icon (with confirmation modal)
- [ ] Clicking a tile opens the project view/edit page
- [ ] UI is desktop-optimized and accessible

#### Definition of Done
- [ ] Code implemented
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Security review completed

---

## 3. Non-Functional Requirements
- Desktop-only, optimized for Safari, Chrome, and Edge
- No authentication required
- All file operations are local
- UI uses modals for confirmations and errors
- High-level error messages in UI; detailed errors in console

---

## 4. Out of Scope
- Adding new AI agents or tech stacks via the UI (filesystem only)
- Cloud or mobile support

---

## 5. Open Issues
- None (all requirements clarified)

---
