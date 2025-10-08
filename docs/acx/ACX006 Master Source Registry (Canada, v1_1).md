# **ACX006 Master Source Registry (Canada, v1.1)**

**Purpose**

Provide a **canonical registry of data sources** used in carbon-acx. This ensures all emission factors, activity schedules, and grid intensities are traceable to verifiable references. This registry enforces our citation policy: **no ACX### docs may serve as primary references**; only external datasets, inventories, peer-reviewed literature, or operator data qualify.

***

## **1. Scope and Rationale**

- **Coverage:** All sources underpinning emission_factors.csv, grid_intensity.csv, profiles.csv, and activity_schedule.csv.
- **Format:** data/sources.csv holds structured metadata; docs/ACX006_MASTER_SOURCES.md (this document) provides narrative context.
- **Citation style:** IEEE numbering, ordered by first mention in ACX-layer docs.
- **Purpose:** Avoid drift and duplication — each external dataset appears once, keyed by source_id.

***

## **2. Schema (sources.csv)**

| **Column** | **Type** | **Notes** |
| --- | --- | --- |
| source\_id | str PK | Stable slug (e.g., SRC.NIR.2025) |
| ieee\_citation | str | Full IEEE-style reference text |
| url | str | Plaintext URL |
| year | int | Publication/data year |
| license | str? | Data license terms (if applicable) |

***

## **3. Source Families**

### **3.1 Federal Inventories & Protocols**

- **National Inventory Report (NIR)** — Canada’s official GHG inventory, annual [1].
- **ECCC emission factors and offset protocols** — reference values for fuels and processes [2].
- **Canadian Environmental Indicators** — Environment Canada’s operational dashboard [3].

### **3.2 Provincial / Territorial Grid Operators**

- **Ontario (IESO)** — Annual planning outlook, hourly/daily grid intensity [4], [5].
- **Alberta (AESO/GoA)** — Annual grid performance and GHG intensity [6], [7].
- **Québec (Hydro-Québec)** — GHG intensity of electricity, life-cycle and operational [8], [9].
- **British Columbia (BC Hydro)** — GHG intensity reports and sustainability documentation [10].
- **Other provinces/territories:** rely on **Canada Energy Regulator profiles** [11].

### **3.3 Canada Energy Regulator (CER)**

- Provincial and territorial energy profiles, including electricity emissions intensity [11].
- Often used to harmonize with NIR; provides accessible, province-specific numbers.

### **3.4 Statistics Canada**

- **Census 2021 commuting patterns** — mode share, distance, telework prevalence [12].
- **Household surveys** — fuel use, appliance penetration.
- **Other statistical tables** relevant for priors (dwellings, energy expenditures).

### **3.5 International / Academic**

- IPCC AR6 emission factors for global comparison [13].
- Peer-reviewed LCA studies for specific activities not covered by Canadian inventories (to be added case by case).

***

## **4. Example Registry Entries**

| **source\_id** | **ieee\_citation** | **url** | **year** | **license** |
| --- | --- | --- | --- | --- |
| SRC.NIR.2025 | Environment and Climate Change Canada, “National Inventory Report: Greenhouse Gas Sources and Sinks in Canada,” 2025. | https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html | 2025 | Open Government |
| SRC.ECCC.EF.2024 | Environment and Climate Change Canada, “Emission Factors and Reference Values—Federal GHG Offset System,” 2024. | https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html | 2024 | Open Government |
| SRC.IESO.2025 | Independent Electricity System Operator, “Power Data Directory,” 2025. | https://www.ieso.ca/power-data/data-directory | 2025 | CC BY 4.0 |
| SRC.AB.GRID.2025 | Government of Alberta, “Greenhouse Gas Emissions Reduction Performance—Electricity Grid Intensity,” 2025. | https://www.alberta.ca/albertas-greenhouse-gas-emissions-reduction-performance | 2025 | Crown Copyright |
| SRC.HQ.OP.2025 | Hydro-Québec, “GHG Emissions and Hydro-Québec Electricity,” 2025. | https://www.hydroquebec.com/sustainable-development/specialized-documentation/ghg-emissions.html | 2025 | HQ Copyright |
| SRC.CER.PROF.24 | Canada Energy Regulator, “Provincial and Territorial Energy Profiles,” 2024. | https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/ | 2024 | Open Government |
| SRC.STATCAN.C21 | Statistics Canada, “Commuting Reference Guide, Census of Population, 2021,” 2022. | https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm | 2022 | Statistics Canada Open License |

***

## **5. Usage in CSVs**

- **emission_factors.csv:** every EF row must have source_id.
- **grid_intensity.csv:** every intensity row must cite a registry source.
- **profiles.csv / activity_schedule.csv:** may include schedule_notes with references; if numeric priors are used (e.g., commute mode shares), they must cite a source_id.

***

## **6. Quality Assurance**

- **tests/test_sources.py** (to be written):
    - Every source_id in any CSV must resolve to sources.csv.
    - year must be numeric ≤ current year.
    - IEEE string must exist and not be empty.
- **CI rule:** build fails if any row lacks source_id or references a non-existent key.

***

## **7. Governance**

- New sources are added only via PR.
- PR must include:
    - Full IEEE citation in sources.csv.
    - URL and license.
    - Where it is used (which EF/region/profile).
- Branch protection: /data/sources.csv requires CODEOWNER review.

***

## **References (for ACX006 itself)**

[1] Environment and Climate Change Canada, “Canada’s Official Greenhouse Gas Inventory—National Inventory Report (NIR),” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html

[2] Environment and Climate Change Canada, “Emission Factors and Reference Values—Federal GHG Offset System,” 2024. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html

[3] Environment and Climate Change Canada, “Greenhouse Gas Emissions—Indicator,” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/environmental-indicators/greenhouse-gas-emissions.html

[4] Independent Electricity System Operator (IESO), “Power Data—Data Directory,” 2025. Available: https://www.ieso.ca/power-data/data-directory

[5] IESO, “Annual Planning Outlook and Emissions Update,” 2024. Available: https://www.ieso.ca/Powering-Tomorrow/2024/Six-Graphs-and-a-Map-2024-Annual-Planning-Outlook-and-Emissions-Update

[6] Government of Alberta, “Greenhouse Gas Emissions Reduction Performance—Electricity Grid Intensity,” 2025. Available: https://www.alberta.ca/albertas-greenhouse-gas-emissions-reduction-performance

[7] Canada Energy Regulator, “Alberta—Provincial Energy Profile (emissions intensity of electricity),” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/provincial-territorial-energy-profiles-alberta.html

[8] Hydro-Québec, “GHG Emissions and Hydro-Québec Electricity,” 2025. Available: https://www.hydroquebec.com/sustainable-development/specialized-documentation/ghg-emissions.html

[9] Hydro-Québec, “Our Energy—GHG Emission Estimates, LCA,” 2025. Available: https://www.hydroquebec.com/about/our-energy.html

[10] BC Hydro, “GHG Intensity and Sustainability Reports,” 2024. Available: https://www.bchydro.com/sustainability

[11] Canada Energy Regulator, “Provincial and Territorial Energy Profiles,” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/

[12] Statistics Canada, “Commuting Reference Guide, Census of Population, 2021,” 2022. Available: https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm

[13] Intergovernmental Panel on Climate Change (IPCC), “Climate Change 2021: The Physical Science Basis—Working Group I Contribution to the Sixth Assessment Report,” 2021. Available: https://www.ipcc.ch/report/ar6/wg1/

***