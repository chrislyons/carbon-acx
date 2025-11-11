Update (or create) the /wireframes directory in this repository and generate comprehensive Mermaid diagram documentation with accompanying explanatory text. Be sure to put your work in a version-tagged folder –– existing wireframes should already be in versioned folders. The objective is to fully inform human developer partners on all aspects of this codebase, enabling them to understand the architecture that has evolved and get more involved in development decisions.

Generate the following paired documentation files:

For each topic, create TWO files:
- {topic}.mermaid.md - Pure Mermaid diagram only
- {topic}.notes.md - Extended documentation and insights

Topics to cover:
1. **repo-structure** - Complete directory tree visualization
2. **architecture-overview** - High-level system design
3. **component-map** - Detailed component breakdown
4. **data-flow** - How data moves through the system
5. **entry-points** - All ways to interact with the codebase
6. **database-schema** (if applicable) - Data model visualization
7. **authentication-authorization** (if applicable) - Security flows
8. **deployment-infrastructure** (if applicable) - How the code runs

FORMAT for .mermaid.md files:
- ONLY pure Mermaid syntax (no fences, no markdown)
- Start directly with %% comments
- End directly after the diagram
- Must work in mermaid.live without modification
- CRITICAL SYNTAX RULES:
  * Each %% comment line must be on its own line
  * There MUST be a blank line after the last %% comment before the diagram type declaration
  * The diagram type (graph TB, flowchart TD, etc.) must be on its own line
  * Use %% comments at the very top for brief context (2-3 lines max)
  * Make node labels detailed: A["Line 1<br/>Line 2"]
  * Use subgraphs extensively to organize sections

FORMAT for .notes.md files:
- Detailed explanation of the architecture shown in the diagram
- Key architectural decisions and rationale
- Important patterns or conventions used
- Areas of technical debt or complexity
- Common workflows or use cases
- Where to look when making changes to specific areas
- Links or references to related diagrams

CONTENT TO COVER:

- **repo-structure**: Directory purposes, configuration files, code organization patterns, where to find different types of code
- **architecture-overview**: Architectural layers, core components and interactions, external services, tech stack, design patterns
- **component-map**: Module boundaries, responsibilities, dependencies, public APIs, shared utilities
- **data-flow**: Request/response cycles, state management, data transformations, execution paths, event flows
- **entry-points**: Application initialization, API endpoints, CLI commands, background jobs, environment differences
- **database-schema**: ERD, tables/collections, relationships, indexes, migration strategy
- **authentication-authorization**: Auth mechanisms, permissions, session management, protected routes
- **deployment-infrastructure**: Deployment architecture, CI/CD pipeline, environment configs, service dependencies

Use appropriate Mermaid diagram types:
- graph TB or flowchart TD for process flows and architecture
- classDiagram for component relationships and APIs
- erDiagram for database schemas
- sequenceDiagram for request/response cycles

This approach keeps Mermaid files pure for visualizers while providing rich context in separate notes files. Push your work as a PR, identifying that this update only iterates upon /wireframes