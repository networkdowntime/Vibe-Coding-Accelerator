# GitHub Copilot Best Practices & Spec-Driven Development

This repository provides a comprehensive framework for maximizing GitHub Copilot's effectiveness through **spec-driven development methodology**. It includes customized instructions, chatmodes, and prompts that guide systematic development from business requirements to implementation.

## 🎯 Overview

This framework implements a **structured, documentation-first approach** to software development that ensures:
- **Clear traceability** from business needs to code implementation
- **Consistent quality** through standardized templates and workflows
- **Systematic development** with proper dependency management
- **Maintainable architecture** through documented decision-making

### Spec-Driven Development Flow
```
BRD → PRDs with User Stories → System Architecture (ADRs) → SRDs → Implementation Tasks → Code
```

## 🚀 Quick Start

### For New Projects (Greenfield Development)

1. **Clone and Setup**
   ```bash
   git clone https://github.com/your-org/github-copilot-best-practices.git your-project-name
   cd your-project-name
   rm -rf .git && git init
   ```

2. **Start Greenfield Development**
   - Change your Copilot chat agent to **`greenfield-development`**
   - Begin describing your idea/project to Copilot
   - Iterate until requirements are well-defined and project structure is created

3. **Generate Implementation Tasks**
   - Change agent back to **Agent**
   - Use the `/task-generation` prompt to break down requirements into tasks

4. **Execute Implementation**
   - Use the `/task-execution` prompt to systematically implement tasks

### For Existing Projects (Feature Addition)

1. **Add Feature to Existing Project**
   - Change your Copilot chat agent to **`add-feature`**
   - Describe the new feature you want to add
   - Let Copilot review existing documentation and guide feature integration

2. **Generate Feature Tasks**
   - Use the `/task-generation` prompt with updated requirements

3. **Execute Feature Implementation**
   - Use the `/task-execution` prompt to implement feature tasks

## 📁 Repository Structure

```
├── .github/
│   └── instructions/           # GitHub Copilot instruction files
│       ├── security-owasp.instructions.md
│       ├── spec-workflow-*.instructions.md
│       ├── tech-*.instructions.md
│       ├── ui-ux-*.instructions.md
│       └── sql-*.instructions.md
├── chatmodes/                  # Custom Copilot chat modes
│   ├── greenfield-development.chatmode.md
│   └── add-feature.chatmode.md
└── prompts/                    # Reusable prompt templates
    ├── task-generation.prompt.md
    └── task-execution.prompt.md
```

## 🛠️ Development Workflows

### 1. Greenfield Development Workflow

**Use Case**: Starting a new project from scratch

**Chatmode**: `greenfield-development`

**Process**:
1. **Business Requirements (BRD)**: Define business problem, stakeholders, and goals
2. **Product Requirements (PRDs)**: Create user stories with acceptance criteria
3. **System Architecture**: Design system boundaries and technology decisions
4. **System Requirements (SRDs)**: Detail functional and non-functional requirements
5. **Implementation Tasks**: Generate numbered tasks for systematic development

**Documentation Generated**:
- `business-requirements.md`
- `product-requirements/prd-[feature].md`
- `system-architecture.md`
- `architecture-decisions/adr-[decision].md`
- `system-requirements/srd-[system].md`
- `tasks/[NNNN]-[task-name].md`

### 2. Feature Addition Workflow

**Use Case**: Adding new features to existing projects

**Chatmode**: `add-feature`

**Process**:
1. **Documentation Review**: Analyze existing BRD, PRDs, architecture, and SRDs
2. **Feature Ideation**: Collaborate on feature definition and business alignment
3. **Requirements Integration**: Update existing documentation with new feature requirements
4. **Architecture Assessment**: Evaluate impact on existing systems and create new ADRs
5. **System Requirements Update**: Extend or create SRDs for the new feature
6. **Task Generation**: Create implementation tasks for the feature

**Documentation Updated**:
- Updated existing BRD, PRDs, architecture documents
- New ADRs for architectural decisions
- Updated/new SRDs for affected systems
- New implementation tasks

## 🎯 Chatmodes

### `greenfield-development`
- **Purpose**: Guide complete project development from ideation to requirements
- **Input**: Business idea or problem statement
- **Output**: Complete spec-driven documentation ready for task generation
- **Use When**: Starting new projects, major system redesigns

### `add-feature`
- **Purpose**: Add new features to existing projects while maintaining consistency
- **Input**: Existing project documentation + new feature description
- **Output**: Updated documentation with integrated feature requirements
- **Use When**: Extending existing systems, adding new capabilities

## 📝 Prompt Templates

### `/task-generation`
Converts System Requirements Documents (SRDs) into numbered implementation tasks:
- Analyzes SRDs, PRDs, and architectural decisions
- Creates numbered tasks (`[NNNN]-[task-name].md`)
- Establishes dependencies and acceptance criteria
- Provides comprehensive task templates with traceability

### `/task-execution`
Systematically implements numbered tasks:
- Executes one task at a time with user approval
- Maintains traceability to requirements documents
- Follows quality gates and testing requirements
- Updates documentation and commits with proper context

### `/prd-creation`
Creates comprehensive Product Requirements Documents:
- Structures user stories with acceptance criteria
- Defines user personas and workflows
- Establishes success metrics and priorities

## 🔧 Instruction Files

### Core Standards
- **`tech-general-coding.instructions.md`**: Universal coding standards (root file)
- **`security-owasp.instructions.md`**: Security best practices and OWASP guidelines
- **`tech-performance-optimization.instructions.md`**: Performance optimization patterns

### Language-Specific Standards
- **`tech-java.instructions.md`**: Java development standards
- **`tech-javascript.instructions.md`**: JavaScript best practices
- **`tech-typescript.instructions.md`**: TypeScript development guidelines
- **`tech-python.instructions.md`**: Python coding standards

### Framework-Specific Standards
- **`tech-springboot.instructions.md`**: Spring Boot patterns and practices
- **`tech-quarkus.instructions.md`**: Quarkus development guidelines
- **`tech-angular.instructions.md`**: Angular framework standards
- **`tech-reactjs.instructions.md`**: React development best practices

### Workflow Instructions
- **`spec-workflow-brd-creation.instructions.md`**: Business Requirements Document creation
- **`spec-workflow-prd-creation.instructions.md`**: Product Requirements Document creation
- **`spec-workflow-system-architecture-creation.instructions.md`**: System architecture documentation
- **`spec-workflow-srd-creation.instructions.md`**: System Requirements Document creation
- **`spec-workflow-task-generation.instructions.md`**: Implementation task generation
- **`spec-workflow-task-execution.instructions.md`**: Task execution methodology

### Specialized Instructions
- **`ui-ux-tailwind.instructions.md`**: UI/UX design with Tailwind CSS
- **`sql-sp-generation.instructions.md`**: SQL and stored procedure guidelines
- **`tech-containerization-docker.instructions.md`**: Docker and containerization best practices

## 📋 Best Practices

### Documentation Standards
- **Traceability**: Every implementation task traces back to business requirements
- **Version Control**: All documentation under version control with clear change tracking
- **Templates**: Consistent formatting using standardized templates
- **Living Documentation**: Keep documentation updated as understanding evolves

### Development Standards
- **Quality Gates**: Built-in validation at each phase of development
- **Testing Strategy**: Comprehensive testing at unit, integration, and system levels
- **Security First**: Security considerations integrated throughout development
- **Performance**: Performance optimization patterns applied consistently

### Workflow Integration
- **Sequential Execution**: Tasks executed in proper dependency order
- **User Approval**: Explicit approval required before starting each task
- **Progress Tracking**: Clear progress indicators and completion criteria
- **Continuous Improvement**: Capture lessons learned and refine processes

## 🤝 Contributing

When contributing to this repository:

1. **Follow Spec-Driven Process**: Use the greenfield development workflow for major changes
2. **Update Documentation**: Ensure all instruction files remain synchronized
3. **Test Workflows**: Validate chatmodes and prompts work as expected
4. **Maintain Quality**: Follow the coding standards defined in instruction files

## 📚 Resources

- **GitHub Copilot Documentation**: [Official GitHub Copilot Docs](https://docs.github.com/en/copilot)
- **Spec-Driven Development**: Internal methodology documentation in `/instructions/spec-workflow-*`
- **Code Quality**: Language and framework-specific standards in `/instructions/tech-*`
- **Security Guidelines**: OWASP-based security practices in `/instructions/security-*`

---

**Get Started**: Clone this repository, use the `greenfield-development` chatmode, and begin building better software with GitHub Copilot!