# Contributing

Thanks for investing time in carbon-acx! This guide explains how to prepare a
change, what quality bars we expect, and how to keep the seeding protocol
predictable across pull requests.

## Getting started

1. Install toolchain prerequisites listed in the [README](README.md#local-development).
2. Create a new branch from `main`.
3. Run the local quality targets at least once before opening your pull request:

   ```bash
   make lint
   make test
   make build site package
   ```

## Pull request checklist

Include the following confirmations in every pull request description:

- [ ] **Schema rules** — emission factor rows use XOR activity or profile keys,
      unit symbols match `data/units.csv`, and each record carries an explicit
      `vintage`.
- [ ] **Sources-first / null-first** — every new measurement references a
      `source_id` from `data/sources.csv`, and missing or unverifiable values are
      left `null` rather than guessed.
- [ ] **Tests** — `make lint`, `make test`, and `make build site package` were
      run locally and relevant fixture updates are included.
- [ ] **Activities & emission factors** — additions or edits in
      `data/activities.csv` and `data/emission_factors.csv` include matching
      schedule/profile entries when required.
- [ ] **Grid intensity** — updates in `data/grid_intensity.csv` note their
      temporal coverage and region identifiers.
- [ ] **Profiles** — new rows in `data/profiles.csv` describe the profile type,
      unit, and default interpretation in the accompanying source reference.
- [ ] **References** — any new `source_id` has a complete citation in
      `data/sources.csv` and supporting material is attached to the pull request.
- [ ] **Parity** — backend parity tests pass locally (`pytest
      tests/test_backend_parity.py`).

## Working with data inputs

### Adding activities

- Append new activities to `data/activities.csv` with globally unique IDs.
- Document the purpose and system boundary in the `description` column.
- If the activity should appear on schedules, update `data/activity_schedule.csv`
  with the appropriate cadence and reference IDs.

### Emission factors (EFs)

- Ensure each EF row references exactly one of `activity_id` or `profile_id`.
- Provide the measurement `unit` and `vintage` year aligned to the source.
- Link to the provenance using an existing or new `source_id`.

### Grid intensity

- Capture regional identifiers (ISO country or balancing authority).
- Record the averaging window (hourly, daily, annual) in the metadata columns.
- Note refresh expectations in the pull request under **Vintage Notes**.

### Profiles and schedules

- Keep profile IDs consistent across `profiles.csv`, `activity_schedule.csv`,
  and any derived artifacts.
- When a profile replaces an existing series, deprecate the prior row by
  updating its `sunset_vintage`.

## Updating references

- Amend `data/sources.csv` with complete bibliographic details for every new
  source: title, publisher, publication year, URL, and access timestamp.
- Store supporting PDFs or spreadsheets in external storage and link them in
  the pull request description when licenses permit.

## Acceptance expectations

Pull requests should leave the repository in a releasable state:

- All quality gates succeed locally and in CI.
- The README instructions continue to match the codebase — update them when
  behaviours or targets change.
- New data preserves backward compatibility for downstream consumers unless the
  change is explicitly flagged in **Scope Notes**.
