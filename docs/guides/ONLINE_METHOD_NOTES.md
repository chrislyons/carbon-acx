# Online Method Notes

This note documents the phase-1 emission factor assumptions for the online layer. Electricity use is
reported in kilowatt-hours per activity unit and maps to grid intensity at runtime. All assumptions
follow the null-first and sources-first rules—values remain unset where supporting data are
unavailable.

## Shared intensity assumptions

* **Network electricity intensity**: The IEA reports that global data transmission networks consumed
  roughly 260 TWh to move 23 zettabytes in 2022, equivalent to ~0.010 kWh/GB when averaged across the
  fleet.【F:data/sources.csv†L16-L24】
* **Data-centre allocation per GB**: The Lawrence Berkeley National Laboratory 2024 update attributes
  ~125 TWh of global data-centre demand to cloud and colocation workloads handling ~25 zettabytes of
  egress, or about 0.005 kWh/GB.【F:data/sources.csv†L17-L24】
* **Scope3 data-transfer intensities**: Scope3’s 2024 methodology provides workload-specific
  bandwidth estimates for streaming, conferencing, and downloads; we combine these with the
  intensities above to derive electricity per unit.【F:data/sources.csv†L18-L24】

Unless otherwise stated we assume `Operational electricity` scope, i.e., end-use devices plus network
and data-centre electricity.

## Activity calculations

### MEDIA.STREAM.HD.HOUR.TV

* Netflix lists HD streaming bitrates of ~3.0 GB/h for 1080p playback and typical smart TV draw near
  120 W while streaming.【F:data/sources.csv†L15-L24】
* Combining 3.0 GB/h with the network (0.010 kWh/GB) and data-centre (0.005 kWh/GB) intensities yields
  0.045 kWh/h of upstream electricity. Adding the 0.12 kWh/h TV device load results in **0.165 kWh per
  hour**.

### CONF.HD.PARTICIPANT_HOUR

* Scope3 reports ~2.8 GB/h of bidirectional data for HD conferencing, consistent with Zoom/Teams
  benchmarks.【F:data/sources.csv†L18-L24】
* Dimpact’s 2021 profiling shows laptops drawing roughly 45 W during video calls.【F:data/sources.csv†L6-L12】
* Electricity per participant hour = 2.8 GB/h × (0.010 + 0.005) kWh/GB + 0.045 kWh device ≈
  **0.082 kWh**.

### CLOUD.DOWNLOAD.GB

* Scope3’s data-transfer method allocates 1 GB of download traffic to 1 GB of cloud egress.
* Applying the shared intensities gives 1 GB × (0.010 + 0.005) kWh/GB = **0.015 kWh per gigabyte**.

### SOCIAL.SCROLL.HOUR.MOBILE

* Dimpact estimates social-media browsing consumes ~0.12 GB/h and a smartphone draws ~3 W while
  engaged.【F:data/sources.csv†L6-L12】
* Electricity per hour = 0.12 GB/h × (0.010 + 0.005) kWh/GB + 0.003 kWh device ≈ **0.0048 kWh**.

### AI.LLM.INFER.1K_TOKENS.GENERIC

* Scope3’s 2024 generative AI methodology and the LBNL 2024 data-centre update converge on ~3 Wh per
  1 k token completion for a 70 B parameter class model, inclusive of data-centre overhead.【F:data/sources.csv†L17-L24】
* We record **0.003 kWh per 1k tokens** under Operational electricity.

## Grid data refresh

Ontario receives a 2025 grid-intensity update sourced from the latest IESO emissions reporting, while
the 2025 rows for Québec, Alberta, and British Columbia reference the National Inventory Report. CER
2024 snapshots backstop the remaining provincial intensities.【F:data/grid_intensity.csv†L2-L18】【F:data/sources.csv†L19-L24】
