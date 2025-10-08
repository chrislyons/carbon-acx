# **ACX017 Governance & Maintenance Charter (Canada Pilot, v1.1)**

**Purpose**

Define governance structures, responsibilities, and maintenance protocols for the **carbon-acx** project. This charter ensures data integrity, enforceable review standards, and long-term sustainability as the dataset and user base grow. It complements ACX006 (Master Source Registry), ACX010 (Testing & Validation Plan), and ACX015 (Data Seeding Protocol).

***

## **1. Governance Principles**

1. **Transparency**
    - Every number is tied to an external, verifiable source (IEEE citation in sources.csv).
    - All changes are made via Git commits and reviewed PRs; no silent edits.
2. **Accountability**
    - CODEOWNERShip defined by domain (data, schema, deployment).
    - Each PR must have at least one review from the responsible owner.
3. **Sustainability**
    - Update cadence defined per data type (grid, factors, profiles).
    - Old vintages retained; never overwrite history.
4. **Reproducibility**
    - All builds deterministic; golden artifacts (ACX010) prevent drift.
    - Each deployed dataset is snapshot-stable with manifest.

***

## **2. Roles & Responsibilities**

### **2.1 CODEOWNERS (initial structure)**

- /data/*.csv — **Data Owner** (research validation, sources, citations).
- /calc/schema.py, /calc/derive.py, /calc/dal.py — **Engineering Owner** (validators, calculation logic).
- /docs/*.md — **Documentation Owner** (consistency, IEEE compliance).
- /app/* — **UX Owner** (visualization, accessibility, references panel).
- .github/workflows/*, Makefile — **CI/CD Owner** (build/release integrity).

### **2.2 Review expectations**

- **Data PRs**: must have Data Owner + Engineering Owner approval.
- **Schema/logic PRs**: must have Engineering Owner + at least one other domain.
- **Deployment PRs**: must have CI/CD Owner approval.
- **Docs PRs**: require Documentation Owner; if affecting scope/definitions, also Data Owner.

***

## **3. Update Cadence**

- **Emission factors**
    - Annual check against: Environment and Climate Change Canada (NIR, EF registry) [1], IPCC updates [2].
    - Corporate ESG reports reviewed quarterly (where applicable).
- **Grid intensities**
    - Ontario (IESO) — annual review of published operational averages [3].
    - Provincial/territorial intensities — annual check via CER [4].
- **Profiles/schedules**
    - Updated after each Canadian Census (5-year cycle).
    - Interim updates if new StatCan surveys alter commuting/telework baselines.
- **Sources registry**
    - Audit annually: dead links, license changes, corrections.
    - IEEE strings locked; URL rot mitigated via Web Archive snapshots.
- **Docs**
    - Review quarterly for alignment with schema/tests.
    - Major updates synchronized with schema versioning (e.g., v1.2, v1.3).

***

## **4. Versioning and Backwards Compatibility**

- **Semantic versioning** for schema and outputs: vMAJOR.MINOR.PATCH.
- **Rules**:
    - MINOR bumps: new activities, cohorts, or sources added without breaking schema.
    - MAJOR bumps: schema headers or validator rules changed.
- **Deprecation**: old fields never deleted mid-version; flagged in method_notes until next MAJOR release.

***

## **5. Enforcement Mechanisms**

1. **CI/CD Gates (ACX010)**
    - Build fails if IEEE refs missing, schema violated, or golden artifacts drift unexplained.
2. **CODEOWNERS file**
    - Configured in .github/CODEOWNERS; ensures mandatory reviews.
3. **Branch Protection**
    - main requires green CI.
    - Force pushes disabled.
4. **Pull Request Templates**
    - Every PR must state:
        - Which data/logic is changed.
        - Which source(s) were added or updated.
        - Whether scope boundary/vintage changed.

***

## **6. Community & Contribution Policy**

- **Contributor onboarding**
    - New contributors must review ACX001–ACX017.
    - First PR must pass CI and include at least one IEEE-cited data row.
- **Licensing**
    - MIT License for code.
    - Data subject to external source licenses; /data/sources.csv must capture licensing metadata.
- **Attribution**
    - External datasets acknowledged in /docs/ACKNOWLEDGMENTS.md.
    - IEEE references always preserved; contributors do not alter them for style.

***

## **7. Maintenance Risks & Mitigation**

- **Risk: stale factors** → Mitigation: annual scheduled update sweep.
- **Risk: citation rot** → Mitigation: annual audit + archived URLs.
- **Risk: inconsistent cross-layer data** → Mitigation: enforce integration tests across ACX011–ACX014 (future ACX018).
- **Risk: governance drift** → Mitigation: review this charter annually; update CODEOWNERS.

***

## **8. Deliverables**

- .github/CODEOWNERS defining owners per domain.
- docs/ACX017_GOVERNANCE_CHARTER.md (this document).
- PR template in .github/pull_request_template.md.
- Quarterly maintenance schedule documented in docs/MAINTENANCE_CALENDAR.md.

***

## **9. References**

[1] Environment and Climate Change Canada, “National Inventory Report: Greenhouse Gas Sources and Sinks in Canada,” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html

[2] Intergovernmental Panel on Climate Change (IPCC), “AR6 Guidelines and Metrics,” 2021–2023. Available: https://www.ipcc.ch/report/ar6/

[3] Independent Electricity System Operator (IESO), “Annual Planning Outlook and Power Data,” 2025. Available: https://www.ieso.ca/power-data/data-directory

[4] Canada Energy Regulator, “Provincial and Territorial Energy Profiles,” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/