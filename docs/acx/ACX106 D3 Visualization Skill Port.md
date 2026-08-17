# D3 Visualization Skill Port

**Date:** 2026-08-17

## Completed

Ported the Whitebox Hermes data-science visualization skill set to Cloudkicker under `~/.hermes/skills/data-science/`:

- `d3-visualization/SKILL.md`
- Four D3 references: rendering foundations, framework integration, interaction and motion, and layouts/spatial visualization.
- `visualization-techniques/SKILL.md`
- Five chart-selection references: distributions, relationships and time, composition and flow, matrix and hierarchy, and multivariate caveats.

The 11 local files match the Whitebox source SHA-256 hashes. Whitebox `~/.omp/agent/skills/` was checked and contains no D3-adjacent data-science skill files, so no `.omp` skill files were copied.

## Decision

Keep the port in Cloudkicker’s Hermes skill tree because the source skills live under Whitebox `~/.hermes/skills/data-science/`; do not duplicate them into `.omp` without a corresponding source skill.
