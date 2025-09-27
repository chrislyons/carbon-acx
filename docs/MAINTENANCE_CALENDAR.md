# Maintenance calendar

Keeping the carbon-acx data pipeline trustworthy requires planned refreshes and
dependency reviews. Use this calendar to schedule the most common maintenance
tasks.

## Quarterly

- **Dependency review** — audit Poetry dependencies (`poetry show --outdated`),
  upgrade minor versions where possible, and regenerate the SBOM via `make sbom`.
- **Grid intensity refresh** — re-fetch balancing authority and grid intensity
  datasets, update `data/grid_intensity.csv`, and rerun backend parity tests.

## Annual

- **Profile refresh** — confirm long-lived profiles and schedules still reflect
  current operating assumptions; update `data/profiles.csv` and
  `data/activity_schedule.csv` as needed.
- **Sources audit** — review `data/sources.csv` for broken links, outdated
  citations, or retired publications. Replace stale references and record access
  timestamps.
