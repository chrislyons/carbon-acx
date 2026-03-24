# Carbon ACX Documentation

Documentation index for the Carbon ACX recovery baseline. The active product surfaces are `apps/carbon-acx-web/`, packaged artifacts from `calc/`, and the analyst Dash app in `app/`. Legacy planning and prototype material lives under the archive paths.

## Directory Structure

```
docs/
├── README.md                  # This file - documentation index
├── archive/CHANGELOG.md       # Project changelog (archived path)
├── archive/TESTING_NOTES.md   # Testing guidelines and QA expectations
├── archive/WHAT_RUNS_WHERE.md # Environment expectations and runtime requirements
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

### Essential Reference Docs

- **[archive/CHANGELOG.md](./archive/CHANGELOG.md)** - Project changelog
- **[archive/TESTING_NOTES.md](./archive/TESTING_NOTES.md)** - QA guidelines
- **[archive/WHAT_RUNS_WHERE.md](./archive/WHAT_RUNS_WHERE.md)** - Runtime environments

### ACX Documentation Series

The `acx/` directory contains numbered ACX documents following workspace conventions:

**Format**: `ACX<NUM>.md` where NUM is 3-4 digits, zero-padded, sequential

Most historical ACX implementation notes now live under `acx/archive/`.

**Browse All**: See `acx/` for active index documents and `acx/archive/` for prior sprint history.

### Guides

Most historical guides now live under `guides/archive/`. Treat them as reference material unless they explicitly describe the current recovery baseline.

### Audits

Most historical audits now live under `audits/archive/`.

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
