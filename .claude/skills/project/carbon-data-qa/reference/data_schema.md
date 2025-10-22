# Carbon ACX Data Schema Reference

This document describes the structure of CSV data files in the `data/` directory.

## Core Data Files

### activities.csv

Catalog of all carbon-relevant activities.

**Schema:**
```
activity_id          STRING   - Unique identifier (e.g., FOOD.COFFEE.CUP.HOT)
sector_id            STRING   - Sector classification (e.g., SECTOR.PROFESSIONAL_SERVICES)
layer_id             STRING   - Layer assignment (e.g., professional, online, industrial_heavy)
category             STRING   - Activity category (e.g., food, media, logistics)
name                 STRING   - Human-readable name
default_unit         STRING   - Default unit for this activity (references units.csv)
description          STRING   - Detailed description of activity scope
unit_definition      STRING   - Clarification of unit meaning
notes                STRING   - Additional context or caveats
```

**Key Concepts:**
- `activity_id` is globally unique and hierarchically structured
- Activities are organized by sector → layer → category
- Each activity has a default unit that should match emission factor units

### emission_factors.csv

Emission factors linking activities to CO2e values.

**Schema:**
```
activity_id          STRING   - References activities.csv
profile_id           STRING   - Optional profile reference
emission_factor_kg   FLOAT    - Emission factor in kgCO2e per unit
unit                 STRING   - Unit this factor applies to
vintage              INTEGER  - Year of data
source_id            STRING   - References sources.csv
notes                STRING   - Methodology notes or caveats
```

**XOR Rule:**
- Each row must have EITHER `activity_id` OR `profile_id`, never both
- This allows factors to apply to individual activities or profiles of activities

**Units:**
- Primary emission factor is always `kgCO2e` (kilograms CO2 equivalent)
- Unit field specifies denominator (per hour, per km, per kWh, etc.)

### sources.csv

Provenance and citations for all emission factors.

**Schema:**
```
source_id            STRING   - Unique source identifier
title                STRING   - Full citation title
publisher            STRING   - Organization or publisher
publication_year     INTEGER  - Year published
url                  STRING   - Source URL
access_timestamp     STRING   - When data was retrieved (ISO 8601)
notes                STRING   - Additional attribution or license info
```

**Usage:**
- Every emission factor should reference a `source_id`
- Missing sources indicate data gaps that need filling

### layers.csv

Layer taxonomy and metadata.

**Schema:**
```
layer_id             STRING   - Unique layer identifier
layer_name           STRING   - Human-readable name
layer_type           STRING   - Type (civilian, industry, crosscut, etc.)
description          STRING   - Layer purpose and scope
icon                 STRING   - Icon reference (optional)
```

**Layer Types:**
- **civilian** - Professional services, consumer activities
- **industry** - Industrial operations (light and heavy)
- **crosscut** - Scenario simulations, earth systems
- **defense** - Military operations and infrastructure

### sectors.csv

Sector taxonomy for activity classification.

**Schema:**
```
sector_id            STRING   - Unique sector identifier
sector_name          STRING   - Human-readable name
description          STRING   - Sector scope
parent_sector_id     STRING   - Optional hierarchical parent
```

### units.csv

Unit definitions and SI conversions.

**Schema:**
```
unit_code            STRING   - Unit symbol (e.g., kWh, pkm, cup)
unit_type            STRING   - Category (energy, distance, time, data, etc.)
si_conversion_factor FLOAT    - Conversion to SI base units
notes                STRING   - Definition and context
```

**Key Unit Types:**
- **energy** - kWh, mmbtu, joules
- **time** - hour, month, year
- **distance** - km, pkm (passenger-kilometre)
- **data** - GB, gb_month, 1k_tokens
- **mass** - kg, tonne
- **volume** - L, m3, cup
- **area** - hectare, square_metre_year
- **count** - serving, unit, garment, event

### profiles.csv

Activity profiles for grouped or templated activities.

**Schema:**
```
profile_id           STRING   - Unique profile identifier
profile_name         STRING   - Human-readable name
profile_type         STRING   - Type classification
default_unit         STRING   - Default unit for this profile
description          STRING   - Profile scope and interpretation
source_id            STRING   - References sources.csv
```

### activity_schedule.csv

Temporal scheduling for activities.

**Schema:**
```
schedule_id          STRING   - Unique schedule identifier
activity_id          STRING   - References activities.csv
profile_id           STRING   - Optional profile reference
cadence              STRING   - Frequency (daily, weekly, monthly, annual)
reference_ids        STRING   - Related reference IDs
```

## Derived Artifacts

### calc/outputs/

Directory containing derived data products generated by `calc/derive.py`:

- **Intensity matrices** - Cross-tabulated emission factors
- **Layer catalogues** - Aggregated layer-level views
- **Manifests** - JSON files with byte hashes and provenance
- **Figure datasets** - Chart-ready data exports

### dist/artifacts/\<hash\>/

Immutable, content-addressed artifacts for deployment:

- Each artifact directory named by content hash
- Contains manifests, figures, and metadata
- Used by Dash, React site, and Workers for consistency

## Data Relationships

```
activities.csv
    ├─ sector_id → sectors.csv
    ├─ layer_id → layers.csv
    ├─ default_unit → units.csv
    └─ activity_id → emission_factors.csv
                          ├─ source_id → sources.csv
                          └─ unit → units.csv

profiles.csv
    ├─ profile_id → emission_factors.csv
    ├─ default_unit → units.csv
    └─ source_id → sources.csv
```

## Common Query Patterns

### Find emission factor for an activity

```python
import pandas as pd

# Load data
activities = pd.read_csv('data/activities.csv')
emission_factors = pd.read_csv('data/emission_factors.csv')
sources = pd.read_csv('data/sources.csv')

# Search for activity
activity = activities[activities['activity_id'] == 'FOOD.COFFEE.CUP.HOT'].iloc[0]

# Get emission factor
ef = emission_factors[emission_factors['activity_id'] == activity['activity_id']].iloc[0]

# Get source
source = sources[sources['source_id'] == ef['source_id']].iloc[0]

print(f"{activity['name']}: {ef['emission_factor_kg']} kgCO2e/{ef['unit']}")
print(f"Source: {source['title']}")
```

### List all activities in a layer

```python
layer_activities = activities[activities['layer_id'] == 'professional']
print(layer_activities[['activity_id', 'name', 'category']])
```

### Aggregate emissions by sector

```python
merged = activities.merge(emission_factors, on='activity_id', how='inner')
sector_totals = merged.groupby('sector_id')['emission_factor_kg'].sum()
print(sector_totals)
```

## Schema Evolution

**Schema changes are tracked through Git history:**
- New columns added with migration notes in commit messages
- Breaking changes increment dataset version
- `vintage` field in emission_factors allows temporal queries

**Current Version:** v1.2 (as of 2025-10-18)

## Validation Rules

**From CONTRIBUTING.md:**

1. **XOR Rule:** Emission factors must have `activity_id` XOR `profile_id`
2. **Unit Consistency:** Activity `default_unit` must align with emission factor `unit`
3. **Source Reference:** All emission factors should reference valid `source_id`
4. **Vintage Required:** Every emission factor must have explicit `vintage` year
5. **Null-First:** Missing data left as null/empty, never guessed

## Related Documentation

- `units_glossary.md` - Detailed unit definitions and carbon accounting terms
- `/data/README.md` - Data file maintenance guide (if exists)
- `CONTRIBUTING.md` - Data quality standards and PR requirements
