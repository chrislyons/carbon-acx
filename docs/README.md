# Carbon ACX Documentation

Comprehensive documentation for the Carbon ACX open reference stack for trustworthy carbon accounting.

## Directory Structure

```
docs/
├── README.md                  # This file - documentation index
├── CHANGELOG.md               # Project changelog
├── TESTING_NOTES.md           # Testing guidelines and QA expectations
├── WHAT_RUNS_WHERE.md         # Environment expectations and runtime requirements
│
├── acx/                       # Numbered ACX documentation series
│   ├── ACX001.md ... ACX086.md
│   └── archive/               # Archived ACX docs
│
├── archive/                   # Dated/obsolete implementation docs
│   ├── FRONTEND_IMPLEMENTATION_STATUS.md
│   ├── FRONTEND_POLISH_PLAN.md
│   ├── FRONTEND_REDESIGN_2025-10-12.md
│   ├── USER_JOURNEYS.md
│   ├── MAINTENANCE_CALENDAR.md
│   └── CONTRIBUTING_SERIES.md
│
├── audits/                    # Repository and code audits
│   ├── AUDIT_2025-10-12.md
│   └── pr_history_review.md
│
└── guides/                    # How-to guides and reference docs
    ├── deploy.md              # Deployment guide
    ├── compare.md             # Comparison utilities
    ├── validation.md          # Validation guide
    ├── share-diff.md          # Sharing and diffing
    ├── routes.md              # Application routes
    ├── THEMING.md             # Design system and theming
    ├── UX-IA.md               # UX and information architecture
    └── ONLINE_METHOD_NOTES.md # Online methodology notes
```

## Quick Navigation

### Essential Reference Docs (Root)

- **[CHANGELOG.md](./CHANGELOG.md)** - Project changelog
- **[TESTING_NOTES.md](./TESTING_NOTES.md)** - QA guidelines
- **[WHAT_RUNS_WHERE.md](./WHAT_RUNS_WHERE.md)** - Runtime environments

### ACX Documentation Series

The `acx/` directory contains numbered ACX documents following workspace conventions:

**Format**: `ACX<NUM>.md` where NUM is 3-4 digits, zero-padded, sequential

**Latest Documents**:
- **[ACX080.md](./acx/ACX080.md)** - Phase 1 rebuild strategy (canvas-first architecture)
- **[ACX082.md](./acx/ACX082.md)** - 3D Universe Foundation Sprint planning
- **[ACX083.md](./acx/ACX083.md)** - Phase 3: Sphere Distribution & Layout System
- **[ACX084.md](./acx/ACX084.md)** - Phase 4: Camera Choreography & Intro Animation
- **[ACX085.md](./acx/ACX085.md)** - SSR Fix & Phase 5 Completion
- **[ACX086.md](./acx/ACX086.md)** - Session Report: SSR Crisis Resolution

**Browse All**: See `acx/` directory for complete chronological listing.

### Guides

- **[deploy.md](./guides/deploy.md)** - Deployment instructions
- **[THEMING.md](./guides/THEMING.md)** - Design tokens and theming system
- **[UX-IA.md](./guides/UX-IA.md)** - User experience and information architecture
- **[routes.md](./guides/routes.md)** - Application routing reference
- **[validation.md](./guides/validation.md)** - Data validation guide

### Audits

- **[AUDIT_2025-10-12.md](./audits/AUDIT_2025-10-12.md)** - Comprehensive repository audit
- **[pr_history_review.md](./audits/pr_history_review.md)** - Pull request history analysis

### Archive

Dated implementation docs and obsolete planning documents. Kept for historical reference.

- **[FRONTEND_IMPLEMENTATION_STATUS.md](./archive/FRONTEND_IMPLEMENTATION_STATUS.md)** - Phase 1-3 frontend status (2025-10-12)
- **[USER_JOURNEYS.md](./archive/USER_JOURNEYS.md)** - User journey mapping

## Documentation Conventions

### Naming Convention

**Pattern**: `<PREFIX><NUM>.(md|mdx)`

- **Prefix**: 3-4 uppercase letters (e.g., `ACX`, `HBX`, `OCC`)
- **Number**: 3-4 digits, zero-padded, sequential
- **Regex**: `^([A-Z]{3,4})(\d{3,4})\.(md|mdx)$`

**Examples**: `ACX001.md`, `ACX085.md`

### Document Structure

All structured documentation (ACX series) follows this template:

```markdown
# <Title>

<1-4 sentence purpose>

## Context
<Background>

## Decisions / Artifacts
<What was decided/created>

## Next Actions
- [ ] <Next step>

## References
[1] <URL>
```

### Citations

External claims must be cited in IEEE style:

```markdown
## References
[1] https://example.com/source
[2] https://another-source.com/article
```

### Discovery Before Creating

Before creating a new ACX document:

```bash
ls -1 docs/acx/*.md | grep -E "^ACX[0-9]{3,4}\.md$" | sort
```

Find the highest number and increment by 1, preserving digit width (3-4 digits).

## Related Documentation

### Repository Root

- **[README.md](../README.md)** - Project overview and getting started
- **[CLAUDE.md](../CLAUDE.md)** - Repository-specific development rules
- **[AGENTS.md](../AGENTS.md)** - AI assistant policies and review gates
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines

### Workspace

- **[~/chrislyons/dev/CLAUDE.md](../../CLAUDE.md)** - Workspace conventions
- **[~/.claude/CLAUDE.md](~/.claude/CLAUDE.md)** - Global user rules

### Skills & Agents

- **[.claude/skills/](../.claude/skills/)** - Skill definitions
- **[.claude/agents/](../.claude/agents/)** - Agent definitions

## Contributing to Documentation

### Adding New ACX Documents

1. Find the next sequential number:
   ```bash
   ls -1 docs/acx/ACX*.md | tail -1
   ```

2. Create document following template (see "Document Structure" above)

3. Add IEEE-style citations for external sources

4. Update this README if adding a significant milestone document

### Updating Guides

- Guides are evergreen - update in place with version history at bottom
- Add "Last Updated" date and "Version" number
- Major restructures should create new versioned docs

### Archiving Documents

Move dated/obsolete docs to `archive/` to keep root clean:

```bash
git mv docs/OLD_DOC.md docs/archive/
```

Update this README to remove references to archived docs.

## Documentation Standards

### Quality Checklist

- [ ] Clear title and purpose statement
- [ ] Proper markdown formatting
- [ ] Working internal links
- [ ] IEEE citations for external sources
- [ ] Code examples tested (if applicable)
- [ ] Screenshots/diagrams current (if applicable)
- [ ] No secrets or credentials
- [ ] Proper grammar and spelling

### Accessibility

- Use descriptive link text (not "click here")
- Provide alt text for images
- Use semantic headings (H1, H2, H3 hierarchy)
- Avoid ASCII art (use diagrams or Mermaid instead)
- Test with screen reader if possible

### Maintenance

- Review docs quarterly for accuracy
- Archive obsolete implementation status docs
- Update version numbers when content changes
- Keep directory structure flat (max 2 levels)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-27
**Maintainer**: Carbon ACX Core Team
