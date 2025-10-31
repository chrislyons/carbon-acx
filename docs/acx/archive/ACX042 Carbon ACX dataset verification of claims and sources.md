# Carbon ACX dataset verification of claims and sources

## Scope

Reviewed claims and referenced material surfaced in the Carbon ACX repo areas you specified: `artifacts/`, `data/`, and `site/public/artifacts/`. Focus: (1) external real-world claims (numbers, methods, standards) tied to emissions factors, grid intensity, activity schedules, and UI copy; (2) unresolved placeholders; (3) ambiguous statements that require follow-up.

## Method (what was verified)

- **Traceability checks.** Each numeric or methodological claim must map to a stable external source and appear as a full IEEE entry in `sources.csv` with a plain-text URL [1], [2], [3], [4].
- **Boundary checks.** Electricity intensity labeled **operational** vs **life-cycle** consistently; GWP horizon labeled **GWP100 (AR6)** unless otherwise stated [2], [5].
- **Canadian context.** For the Toronto/Ontario pilot, electricity intensity and transport EFs must prefer Canadian federal/provincial sources where available [1], [3], [6], [7].
- **Online services.** Streaming and data/network claims cross-checked to IEA/DIMPACT or equivalent literature where used [8], [9].
- **Civic policy context.** Toronto-specific idling/by-law or freight references confined to context (not used as EF sources) [10], [11].

## Findings

### A) Claims that are sufficiently sourced

1. **Standards & accounting** — References to GHG Protocol scope definitions and IPCC GWP100 (AR6) are correct and sufficient for boundary and horizon statements [2], [5].
2. **Canada national inventory & provincial context** — Where used, the Environment and Climate Change Canada **National Inventory Report** (NIR) and Canada Energy Regulator profiles provide valid national/provincial anchors [1], [7].
3. **Ontario grid intensity (operational)** — IESO power-data directory is an appropriate canonical source for Ontario operational intensity and related power stats; ensure the exact **vintage year** is captured per figure/export [3].
4. **Census commuting & household behaviours** — Statistics Canada census commuting guide and household expenditure tables are valid sources for modal shares and simple behaviour frequencies when those are used as schedules/weights, not as EFs [6].
5. **Online media baseline** — IEA’s synthesis on data centres and data transmission networks remains a suitable benchmark reference for order-of-magnitude checks; DIMPACT/Carbon Trust report is appropriate for streaming-specific modeling notes when cited as such [8], [9].

### B) Ambiguous or weakly supported claims — action required

1. **Heavy-industrial layer (cement, steel, refinery, mining)** — Documented as stubs; no EF rows should be present until anchored to real factors. Keep hidden by default; do not publish numbers. Action: populate with peer-reviewed or government-grade EFs before enabling any display [12].
2. **Online services granularity (LLM inference, device/network splits)** — If any per-token or GPU-hour values are claimed, bind them to a specific study (e.g., Luccioni et al. for large-model training, Patterson et al. for broader ML footprint trends) and label **assumption ranges** explicitly; otherwise treat as TBD [13], [14].
3. **Electricity LCA vs operational intensity** — Any figure mixing life-cycle electricity with operational series must be split or re-labeled. Action: enforce single-scope per figure; add a toggle to switch scope, with captions updated accordingly [2], [5].
4. **Streaming/video call one-number claims** — If a single gCO₂e per hour is used, you must state device/network assumptions and the region-specific electricity linkage. Prefer citing IEA plus DIMPACT for methodological context; avoid transplanting a number without its scenario [8], [9].

### C) Placeholders detected (must not ship)

- **EF placeholders** in heavy-industrial stubs; retain `NULL`/omitted instead of fake zeros until real EFs are sourced [12].
- **Unspecified vintage years** on grid-indexed rows; add `vintage_year` and method notes [3].
- **Ranges without provenance** (low/high with no source method). Either remove the range or cite the study’s uncertainty bounds [2], [5], [8], [9].

## Remediation plan (minimal, enforceable)

1. **IEEE hygiene gate in CI.** Fail build if any non-NULL numeric field lacks `source_id` mapping to a full IEEE string (with URL), or if electricity series mixes operational/LCA within a single figure [2], [5].
2. **Vintage discipline.** Require `vintage_year` for `grid_intensity.csv` and `emission_factors.csv`; surface the vintage in captions/tooltips [1], [3].
3. **Scope toggles.** Lock each figure to one scope; provide a UI toggle to alternate between **operational** and **LCA** electricity views, re-computing and re-labeling on change [2], [5].
4. **Industrial layers off by default.** Keep heavy-industrial hidden until at least one activity has both a real EF and a non-NULL schedule frequency; do not aggregate into “professional” totals [12].
5. **Online services notes.** When showing streaming/AI figures, display a short assumption block (device mix, resolution/bitrate, network path, region electricity linkage) with bracketed citations [8], [9], [13], [14].

## Clean link list for archiving (plain URLs)

- ECCC NIR (Canada national inventory): [https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html) [1]
- IEA AR6 glossary/metrics (GWP100 context via IPCC): [https://www.ipcc.ch/report/ar6/wg1/](https://www.ipcc.ch/report/ar6/wg1/) [2]
- IESO Power Data (Ontario operational grid intensity): [https://www.ieso.ca/power-data/data-directory](https://www.ieso.ca/power-data/data-directory) [3]
- GHG Protocol (corporate standard/scope definitions): [https://ghgprotocol.org/](https://ghgprotocol.org/) [5]
- Statistics Canada — Commuting Reference Guide (2021): [https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm](https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm) [6]
- Canada Energy Regulator — Provincial/Territorial Profiles: [https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/](https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/) [7]
- IEA — Data centres and data transmission networks: [https://www.iea.org/reports/data-centres-and-data-transmission-networks](https://www.iea.org/reports/data-centres-and-data-transmission-networks) [8]
- Carbon Trust/DIMPACT — Carbon impact of video streaming: [https://dimpact.org/resources](https://dimpact.org/resources) [9]
- City of Toronto — Idling Control By-law (Chapter 517): [https://www.toronto.ca/services-payments/water-environment/environmentally-friendly-city-programs/anti-idling/](https://www.toronto.ca/services-payments/water-environment/environmentally-friendly-city-programs/anti-idling/) [10]
- City of Toronto — Freight and Goods Movement Strategy: [https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-projects/toronto-goods-movement-strategy/](https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-projects/toronto-goods-movement-strategy/) [11]
- Industrial staging guidance (keep stubs inert; populate later): see only as internal policy; when sourcing EFs use sector-specific Canadian/peer-reviewed studies (e.g., steel, cement) [12].
- ML/AI emissions methodology references:
• Patterson et al.: [https://arxiv.org/abs/2204.05149](https://arxiv.org/abs/2204.05149) [13]
• Luccioni et al. (BLOOM): [https://www.jmlr.org/papers/volume24/23-0069/23-0069.pdf](https://www.jmlr.org/papers/volume24/23-0069/23-0069.pdf) [14]

***

## Appendix — IEEE references

[1] Environment and Climate Change Canada, “National Inventory Report: Greenhouse Gas Sources and Sinks in Canada,” 2025. Available: [https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html)
[2] Intergovernmental Panel on Climate Change (IPCC), “AR6—Working Group I: The Physical Science Basis (Glossary and Metrics),” 2021–2023. Available: [https://www.ipcc.ch/report/ar6/wg1/](https://www.ipcc.ch/report/ar6/wg1/)
[3] Independent Electricity System Operator (IESO), “Power Data—Data Directory (Ontario),” 2025. Available: [https://www.ieso.ca/power-data/data-directory](https://www.ieso.ca/power-data/data-directory)
[4] ACX governance and testing notes (internal): used to enforce citation and artifact integrity (no external citation required).
[5] Greenhouse Gas Protocol, “Corporate Accounting and Reporting Standard (Scope Guidance),” 2015–2024. Available: [https://ghgprotocol.org/](https://ghgprotocol.org/)
[6] Statistics Canada, “Commuting Reference Guide, Census of Population, 2021,” 2022. Available: [https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm](https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm)
[7] Canada Energy Regulator, “Provincial and Territorial Energy Profiles,” 2024. Available: [https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/](https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/)
[8] International Energy Agency, “Data Centres and Data Transmission Networks,” 2023. Available: [https://www.iea.org/reports/data-centres-and-data-transmission-networks](https://www.iea.org/reports/data-centres-and-data-transmission-networks)
[9] Carbon Trust (with DIMPACT), “The Carbon Impact of Video Streaming,” 2021. Available: [https://dimpact.org/resources](https://dimpact.org/resources)
[10] City of Toronto, “Idling Control By-law—Chapter 517,” 2024. Available: [https://www.toronto.ca/services-payments/water-environment/environmentally-friendly-city-programs/anti-idling/](https://www.toronto.ca/services-payments/water-environment/environmentally-friendly-city-programs/anti-idling/)
[11] City of Toronto, “Freight and Goods Movement Strategy,” 2024. Available: [https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-projects/toronto-goods-movement-strategy/](https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-projects/toronto-goods-movement-strategy/)
[12] (Sector anchors for heavy industry to add) Examples: cement/steel Canadian EPDs and CSA PCRs—select specific EPDs per facility or national factors before enabling charts. CSA Group, “EPD Program and Product Category Rules (PCR) for Construction Products,” 2024. Available: [https://www.csagroup.org/testing-certification/product-areas/environmental-product-declarations/](https://www.csagroup.org/testing-certification/product-areas/environmental-product-declarations/)
[13] D. Patterson, J. Gonzalez, U. Hölzle, et al., “The Carbon Footprint of Machine Learning Training Will Plateau, Then Shrink,” 2022. Available: [https://arxiv.org/abs/2204.05149](https://arxiv.org/abs/2204.05149)
[14] S. A. Luccioni, S. Viguier, and A.-L. Ligozat, “Estimating the Carbon Footprint of BLOOM, a 176B Parameter Language Model,” *Journal of Machine Learning Research*, vol. 24, 2023. Available: [https://www.jmlr.org/papers/volume24/23-0069/23-0069.pdf](https://www.jmlr.org/papers/volume24/23-0069/23-0069.pdf)

***

If you want, I can now turn this into a CI-enforced checklist (tests that fail on: missing `source_id`, mixed electricity scopes, missing vintage_year, or ranges without provenance) and a `References.txt` builder that assembles the IEEE list per artifact.