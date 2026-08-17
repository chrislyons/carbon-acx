# Carbon ACX Documentation

This directory is the source of truth for the Carbon ACX recovery baseline. The
active product surfaces are the Next.js app in `apps/carbon-acx-web/`, packaged
artifacts from `calc/`, and the analyst Dash app in `app/`. Current dataflow and
release governance is documented in ACX108. Older planning and prototype notes
remain historical records and are not runtime instructions.

## Current Layout

```text
docs/
├── README.md                  # This index
├── acx/
│   ├── ACX.md                 # ACX document catalog
│   ├── ACX099 ... ACX108.md   # Current implementation and audit notes
│   └── archive/               # Historical ACX series where archived
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

- `ACX.md` is the catalog for the numbered ACX series.
- ACX099 through ACX108 are the current implementation and audit notes.
- Earlier numbered documents are historical planning, research, or incident
  records. Treat their paths and commands as historical unless they are linked
  from current guidance.
- When archiving docs, move them into the matching archive directory instead of
  deleting them.

Examples:

- [ACX066 What Runs Where](./acx/ACX066%20What%20Runs%20Where%20%E2%80%93%20Runtime%20%26%20Environment%20Map.md)
- [ACX108 Dataflow Integrity and Provenance Release Audit](./acx/ACX108%20Dataflow%20Integrity%20and%20Provenance%20Release%20Audit.md)

To discover the highest numbered document:

```bash
find docs/acx -maxdepth 1 -type f -name 'ACX[0-9]*.md' | sort
```

## Maintenance Rules

- Keep `docs/acx/ACX.md` aligned with current implementation notes.
- Keep active commands and artifact paths aligned with `README.md`,
  `CONTRIBUTING.md`, and the Makefile.
- Treat `docs/audits/`, `docs/guides/`, and `docs/wireframes/` as archive
  entrypoints unless a new active index is intentionally added.
- Update links and indexes in the same change whenever files move.

## Related Repository Docs

- [README.md](../README.md)
- [CLAUDE.md](../CLAUDE.md)
- [AGENTS.md](../AGENTS.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Version:** 1.2.0
**Last Updated:** 2026-08-17
