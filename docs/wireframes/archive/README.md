# Carbon ACX Wireframes

Comprehensive Mermaid diagram documentation for the Carbon ACX architecture.

---

## Version History

### [v1.0.0](v1.0.0/) - 3D Universe Foundation Sprint (2025-10-27)

Complete architecture documentation reflecting the 3D Universe implementation:
- **Architecture**: 3D+2D hybrid (Three.js + React Three Fiber + 2D overlays)
- **State Management**: Zustand (single store) + TanStack Query (server state)
- **Routing**: React Router 6 (simplified, no XState)
- **Components**: 4-tier system (Primitives → Visualizations → Domain → Pages)
- **SSR Safety**: React.lazy() + Suspense for Three.js components
- **Build**: Vite 5, code-splitting, lazy loading (887KB → 241KB gzip)
- **Deployment**: Cloudflare Pages + Workers, immutable artifact caching

**Diagrams:**
1. Repository Structure - Complete directory tree
2. Architecture Overview - System design and component interactions
3. Component Map - Detailed component breakdown with dependencies
4. Data Flow - User journeys and data transformations
5. Entry Points - All application initialization paths
6. Deployment Infrastructure - Build process and CI/CD pipeline

See [v1.0.0/README.md](v1.0.0/README.md) for detailed documentation.

---

### [v0.0.1](v0.0.1/) - Phase 1 Canvas Architecture (2025-10-26)

Initial architecture documentation (superseded by v1.0.0):
- **Architecture**: Canvas-first with XState journey orchestration
- **State Management**: Dual-store pattern (Zustand + XState)
- **Routing**: StoryScene wrapper with TransitionWrapper
- **Components**: CanvasZone viewport orchestration
- **Status**: Deprecated (replaced by simplified 3D Universe architecture)

---

## Usage

### For New Developers (Onboarding)

Read diagrams in this order:
1. **v1.0.0/2-architecture-overview** - Understand the big picture
2. **v1.0.0/1-repo-structure** - Learn where everything lives
3. **v1.0.0/3-component-map** - Dive into component organization
4. **v1.0.0/4-data-flow** - Follow data through the system
5. **v1.0.0/5-entry-points** - Learn how to run and develop
6. **v1.0.0/6-deployment-infrastructure** - Understand deployment

### For Active Development

**Adding a Feature:**
1. Review **component-map.notes.md** to understand component boundaries
2. Check **data-flow.notes.md** for state management patterns
3. Consult **entry-points.notes.md** for integration points

**Debugging:**
1. Start with **data-flow.notes.md** troubleshooting sections
2. Check **component-map.notes.md** for component interactions
3. Review **entry-points.notes.md** for initialization issues

**Deploying:**
1. Read **deployment-infrastructure.notes.md** for deployment process
2. Check **entry-points.notes.md** for environment differences
3. Review **architecture-overview.mermaid.md** for service dependencies

---

## Viewing Diagrams

### GitHub
All `.mermaid.md` files render automatically on GitHub.

### VS Code
Install the "Markdown Preview Mermaid Support" extension.

### mermaid.live
Copy the entire `.mermaid.md` file content and paste into https://mermaid.live

---

## Maintenance

When updating diagrams:
1. Create a new version folder (e.g., v1.1.0, v2.0.0)
2. Copy relevant diagrams from previous version
3. Update diagrams to reflect current architecture
4. Update this README with version notes
5. Commit with descriptive message

---

## Format Specifications

### .mermaid.md Files
- **Pure Mermaid syntax** (no code fences)
- Starts directly with `%%` comments
- Ends directly after diagram
- Must work in mermaid.live without modification

### .notes.md Files
- **Detailed explanatory text** for each diagram
- Key architectural decisions and rationale
- Common patterns and workflows
- Troubleshooting guidance
- File paths for making changes

---

## Related Documentation

- **CLAUDE.md** - AI assistant context (v2.1, 3D Universe patterns)
- **docs/acx/ACX084.md** - 3D Universe Foundation Sprint documentation
- **apps/carbon-acx-web/README.md** - Web application architecture
- **.claude/agents/mermaid-diagram-generator.md** - Diagram generation guidelines

---

**Current Version:** v1.0.0
**Last Updated:** 2025-10-27
**Maintainer:** Carbon ACX Core Team
