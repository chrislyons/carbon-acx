# Carbon ACX Documentation

This directory is the source of truth for the Carbon ACX recovery baseline. The active product surfaces are the Next.js app in `apps/carbon-acx-web/`, packaged artifacts from `calc/`, and the analyst Dash app in `app/`. Historical planning and prototype material stays archived in-place instead of being mixed back into the active docs root.

## Current Layout

```text
docs/
├── README.md                  # This index
├── acx/
│   ├── ACX.md                 # Active ACX catalog
│   ├── ACX099 ... ACX101.md   # Current titled ACX documents
│   └── archive/               # Historical ACX series
├── archive/                   # General historical implementation docs
├── audits/
│   └── archive/               # Archived audits
├── guides/
│   └── archive/               # Archived guides
├── wireframes/
│   ├── archive/               # Shared wireframe overview archive
│   └── v0.0.x/archive/        # Versioned wireframe archives
└── repo-commands.html         # Command reference
```

## Quick Navigation

- [ACX catalog](./acx/ACX.md)
- [General archive](./archive/)
- [Archived audits](./audits/archive/)
- [Archived guides](./guides/archive/)
- [Wireframe archives](./wireframes/archive/)
- [Command reference](./repo-commands.html)

## ACX Naming Conventions

- `ACX.md` is the live catalog for the numbered ACX series.
- Active numbered documents use the pattern `ACX<NUM> <Title>.md`.
- Historical numbered documents move to `docs/acx/archive/` without changing their filenames.

Examples:

- `ACX099 World Labs and Blender MCP Integration Handoff.md`
- `ACX101 World Labs Integration and Calculator Implementation Sprint.md`

To discover the highest active numbered document:

```bash
find docs/acx -maxdepth 1 -type f -name 'ACX[0-9]*.md' | sort
```

## Maintenance Rules

- Keep `docs/acx/ACX.md` aligned with the active-vs-archived split.
- When archiving docs, move them into the matching archive directory instead of deleting them.
- Treat `docs/audits/`, `docs/guides/`, and `docs/wireframes/` as archive entrypoints unless a new active index is intentionally added.
- Update links and indexes in the same change whenever files move.

## Related Repository Docs

- [README.md](../README.md)
- [CLAUDE.md](../CLAUDE.md)
- [AGENTS.md](../AGENTS.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Version:** 1.1.0  
**Last Updated:** 2026-03-25
