# Citation Gap Report

- Total claims inventoried: 352
- Total issues detected: 65

## Datasets
### emission_factors.csv

- Rows with claims: 90
- Claims inventoried: 317
- Issues detected: 11

#### Issues
- **ef_id=EF.DEMO.COFFEE.FIXED, activity_id=FOOD.COFFEE.CUP.HOT**
  - Missing required field: region
- **ef_id=EF.DEMO.STREAM, activity_id=stream**
  - Missing required field: vintage_year
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
  - Grid-indexed row missing required field: vintage_year
- **ef_id=EF.ONLINE.MEDIA.STREAM.HD.HOUR.TV, activity_id=MEDIA.STREAM.HD.HOUR.TV**
  - Missing required field: region
- **ef_id=EF.ONLINE.CONF.HD.PARTICIPANT_HOUR, activity_id=CONF.HD.PARTICIPANT_HOUR**
  - Missing required field: region
- **ef_id=EF.ONLINE.CLOUD.DOWNLOAD.GB, activity_id=CLOUD.DOWNLOAD.GB**
  - Missing required field: region
- **ef_id=EF.ONLINE.SOCIAL.SCROLL.HOUR.MOBILE, activity_id=SOCIAL.SCROLL.HOUR.MOBILE**
  - Missing required field: region
- **ef_id=EF.ONLINE.AI.LLM.INFER.1K_TOKENS, activity_id=AI.LLM.INFER.1K_TOKENS.GENERIC**
  - Missing required field: region

### grid_intensity.csv

- Rows with claims: 18
- Claims inventoried: 35
- Issues detected: 54

#### Issues
- **region_code=CA, vintage_year=2024**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-ON, vintage_year=2024**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-ON, vintage_year=2025**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-QC, vintage_year=2021**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-QC, vintage_year=2022**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-QC, vintage_year=2023**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-QC, vintage_year=2024**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-QC, vintage_year=2025**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-AB, vintage_year=2021**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-AB, vintage_year=2022**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-AB, vintage_year=2023**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-AB, vintage_year=2024**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-AB, vintage_year=2025**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-BC, vintage_year=2021**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-BC, vintage_year=2022**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-BC, vintage_year=2023**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-BC, vintage_year=2024**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region
- **region_code=CA-BC, vintage_year=2025**
  - Missing required field: scope_boundary
  - Missing required field: gwp_horizon
  - Missing required field: region

## Scanned files
### data_csv
- data/activities.csv
- data/activity_fu_map.csv
- data/activity_schedule.csv
- data/assets.csv
- data/dependencies.csv
- data/emission_factors.csv
- data/entities.csv
- data/feedback_loops.csv
- data/functional_units.csv
- data/grid_intensity.csv
- data/layers.csv
- data/operations.csv
- data/profiles.csv
- data/sites.csv
- data/sources.csv
- data/units.csv

### site_artifacts_json
- site/public/artifacts/audit_report.json
- site/public/artifacts/layers.json

### artifacts_json
- artifacts/audit_report.json
- artifacts/dependency_map.json
