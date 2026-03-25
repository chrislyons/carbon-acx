# Carbon ACX - Wireframe Documentation

**Complete architecture visualization and technical reference**

Last updated: 2025-10-26

## Overview

This directory contains paired Mermaid diagrams (`.mermaid.md`) and detailed technical notes (`.notes.md`) documenting the Carbon ACX application architecture. Each pair provides both visual and narrative understanding of a specific architectural aspect.

## Document Pairs

### 1. Repository Structure
**Files**: `1-repo-structure.mermaid.md` + `1-repo-structure.notes.md`

**Purpose**: Complete directory tree and organizational patterns

**Key Topics**:
- Monorepo workspace structure (pnpm)
- Component tier system (Tier 1-5)
- Data pipeline separation (data/, calc/, dist/)
- Legacy vs. modern application boundaries
- Configuration file purposes

**Use When**:
- Onboarding new developers
- Finding where to add new features
- Understanding code organization philosophy

---

### 2. Architecture Overview
**Files**: `2-architecture-overview.mermaid.md` + `2-architecture-overview.notes.md`

**Purpose**: System-level design and layer relationships

**Key Topics**:
- Canvas-first architecture principles
- Story-driven UI orchestration
- State management strategy (Zustand + XState)
- Data flow from CSV → artifacts → UI
- Deployment topology (Cloudflare Pages/Workers)

**Use When**:
- Designing new features
- Understanding system boundaries
- Making architectural decisions
- Explaining system to stakeholders

---

### 3. Component Map
**Files**: `3-component-map.mermaid.md` + `3-component-map.notes.md`

**Purpose**: React component hierarchy and relationships

**Key Topics**:
- Component tier breakdown (Primitives → Scenes)
- Parent-child relationships
- Prop flow and composition patterns
- Reusability guidelines
- Component responsibilities

**Use When**:
- Creating new components
- Understanding component dependencies
- Refactoring component hierarchy
- Implementing design system

---

### 4. Data Flow
**Files**: `4-data-flow.mermaid.md` + `4-data-flow.notes.md`

**Purpose**: State management and data mutation flows

**Key Topics**:
- Zustand store operations (add/update/remove)
- XState journey transitions
- localStorage persistence
- Computed values (getTotalEmissions)
- Event propagation patterns

**Use When**:
- Debugging state issues
- Adding new state management features
- Understanding data lifecycle
- Optimizing performance

---

### 5. Entry Points
**Files**: `5-entry-points.mermaid.md` + `5-entry-points.notes.md`

**Purpose**: Application initialization and bootstrap flows

**Key Topics**:
- HTML → main.tsx → CanvasApp initialization
- Zustand store hydration from localStorage
- XState machine initialization
- Smart initialization (skip onboarding if data exists)
- Development vs. production entry points
- Legacy application entry (Python Dash, static site)

**Use When**:
- Understanding app startup sequence
- Debugging initialization errors
- Configuring environment variables
- Setting up development environment

---

### 6. Database Schema
**Files**: `6-database-schema.mermaid.md` + `6-database-schema.notes.md`

**Purpose**: Client-side storage schema and data structures

**Key Topics**:
- ProfileData interface (activities, layers, goals, scenarios)
- Zustand store shape and persistence strategy
- XState journey context (NOT persisted)
- localStorage format and constraints
- Data validation and type safety

**Use When**:
- Adding new data entities
- Migrating localStorage schema
- Understanding data relationships
- Debugging data corruption issues

**Important**: No server-side database — all storage is client-side (localStorage).

---

### 7. Deployment Infrastructure
**Files**: `7-deployment-infrastructure.mermaid.md` + `7-deployment-infrastructure.notes.md`

**Purpose**: CI/CD pipeline and edge deployment architecture

**Key Topics**:
- GitHub Actions workflow (lint → build → test)
- Cloudflare Pages auto-deployment
- Cloudflare Workers manual deployment
- Preview deployments for PRs
- Environment variables (CI, Pages, Workers)
- Caching strategy (static assets, artifacts, API)
- Edge CDN delivery (200+ PoPs)

**Use When**:
- Setting up deployments
- Debugging build failures
- Configuring environment variables
- Understanding production infrastructure
- Optimizing performance

---

## File Format Conventions

### .mermaid.md Files

**Purpose**: Visual diagrams using Mermaid syntax

**Format**: Pure Mermaid (no markdown fences)

**Usage**:
```bash
# View in GitHub (auto-renders)
# View in VS Code (with Mermaid extension)
# Export to PNG/SVG (via Mermaid CLI)
```

**Diagram Types Used**:
- `graph TB`: Top-to-bottom flowcharts (architecture, entry points)
- `classDiagram`: UML class diagrams (database schema)
- `sequenceDiagram`: Interaction flows (not currently used)
- `flowchart TB`: Enhanced flowcharts with subgraphs

### .notes.md Files

**Purpose**: Detailed technical explanations

**Format**: Markdown with code examples

**Structure**:
1. **Overview**: High-level summary
2. **Key Topics**: Detailed sections with examples
3. **Code Snippets**: Actual implementation examples
4. **Best Practices**: Guidelines and conventions
5. **Troubleshooting**: Common issues and solutions
6. **Related Diagrams**: Cross-references

**Average Length**: 200-400 lines (10-20KB)

---

## How to Use This Documentation

### For New Developers

**Recommended reading order**:
1. Start with `1-repo-structure` (understand codebase layout)
2. Read `2-architecture-overview` (understand system design)
3. Skim `5-entry-points` (understand app startup)
4. Refer to others as needed

### For Architects

**Recommended reading order**:
1. `2-architecture-overview` (system design)
2. `7-deployment-infrastructure` (production architecture)
3. `4-data-flow` (state management patterns)
4. `6-database-schema` (data modeling)

### For Frontend Developers

**Recommended reading order**:
1. `3-component-map` (React components)
2. `4-data-flow` (Zustand + XState)
3. `5-entry-points` (initialization)
4. `6-database-schema` (data types)

### For DevOps/SRE

**Recommended reading order**:
1. `7-deployment-infrastructure` (CI/CD + edge)
2. `5-entry-points` (build process)
3. `2-architecture-overview` (system topology)

### For Product Managers

**Recommended reading order**:
1. `2-architecture-overview` (high-level design)
2. `3-component-map` (UI features)
3. `7-deployment-infrastructure` (release process)

---

## Maintenance Guidelines

### Updating Diagrams

**When to update**:
- After architectural changes
- When adding major features
- During refactoring
- After directory restructuring

**How to update**:
1. Edit `.mermaid.md` file (pure Mermaid syntax)
2. Update corresponding `.notes.md` file
3. Test rendering (GitHub preview or VS Code)
4. Update "Last updated" timestamp
5. Commit with descriptive message

**Validation**:
```bash
# Install Mermaid CLI (optional)
npm install -g @mermaid-js/mermaid-cli

# Validate syntax
mmdc -i 1-repo-structure.mermaid.md -o test.png
```

### Adding New Documentation

**Naming convention**: `{number}-{topic}.{mermaid|notes}.md`

**Number assignment**: Sequential (next available number)

**Topics to consider**:
- API integration patterns (when backend added)
- Testing architecture (E2E, unit, integration)
- Error handling flows
- Analytics/telemetry
- Accessibility architecture
- Internationalization (i18n)

### Cross-References

All `.notes.md` files include "Related Diagrams" section linking to other wireframes.

**Example**:
```markdown
## Related Diagrams

- See `architecture-overview.mermaid.md` for system context
- See `component-map.mermaid.md` for component hierarchy
- See `data-flow.mermaid.md` for state management
```

---

## Tools and Rendering

### GitHub

Automatically renders `.mermaid.md` files in web interface.

**View**: Click file → See rendered diagram

**Limitation**: No zoom/pan (static render)

### VS Code

**Extension**: Mermaid Editor
- Install: `ext install bierner.markdown-mermaid`
- View: Open `.mermaid.md` → Right-click → "Open Preview"

### Mermaid Live Editor

**URL**: https://mermaid.live/

**Usage**:
1. Copy contents of `.mermaid.md`
2. Paste into editor
3. Export as PNG/SVG/PDF

### Obsidian

Supports Mermaid natively in markdown notes.

**Usage**: Create note, paste Mermaid code in ` ```mermaid ` fence.

---

## File Sizes

| File | Diagram Size | Notes Size | Total |
|------|-------------|-----------|-------|
| 1-repo-structure | 2.9KB | 7.9KB | 10.8KB |
| 2-architecture-overview | 2.7KB | 10KB | 12.7KB |
| 3-component-map | 3.5KB | 15KB | 18.5KB |
| 4-data-flow | 3.1KB | 16KB | 19.1KB |
| 5-entry-points | 4.1KB | 12KB | 16.1KB |
| 6-database-schema | 4.5KB | 18KB | 22.5KB |
| 7-deployment-infrastructure | 4.1KB | 22KB | 26.1KB |
| **Total** | **25KB** | **101KB** | **126KB** |

**Coverage**: ~80% of architecture documented

**Remaining gaps**:
- Testing architecture
- Error handling flows
- Analytics/telemetry
- Security architecture

---

## Version History

**v1.0 (2025-10-26)**: Initial complete wireframe set
- 7 diagram pairs (14 files)
- 126KB total documentation
- Covers: repo structure, architecture, components, data flow, entry points, storage, deployment

**Planned enhancements**:
- Testing architecture diagrams
- Security/threat model diagrams
- Performance optimization flows
- Migration guides (legacy → Phase 1)

---

## Contact

For questions or suggestions about this documentation:
- File issue in repository
- Tag with `documentation` label
- Reference specific wireframe file

---

**Generated**: 2025-10-26
**Format Version**: 1.0
**Coverage**: Core architecture (80%)
**Maintenance**: Update on major architectural changes
