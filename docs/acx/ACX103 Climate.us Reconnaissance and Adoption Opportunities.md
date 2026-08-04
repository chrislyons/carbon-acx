# ACX103 Climate.us Reconnaissance and Adoption Opportunities

**Status:** Complete  
**Date:** 2026-08-04  
**Scope:** Public information architecture, data discovery, publishing signals, and transferable patterns from Climate.us; comparison with the current Carbon ACX web application and OWID reference stack.

**Related:** [ACX047 Our World in Data CO2 and Greenhouse Gas Emissions Platform](./ACX047%20Our%20World%20in%20Data%20CO2%20and%20Greenhouse%20Gas%20Emissions%20Platform.md), [ACX048 The Climate Data Deficit](./ACX048%20The%20Climate%20Data%20Deficit_%20Opportunity%20for%20Carbon%20ACX%20as%20Civic%20Literacy%20Infrastructure.md), [ACX102 Recovery Merge and Calculator Provenance Hardening](./ACX102%20Recovery%20Merge%20and%20Calculator%20Provenance%20Hardening.md)

---

## Executive summary

Climate.us is best understood as a **public climate-information portal**, not as a direct competitor to Carbon ACX. It organizes climate communication around three public jobs: **News & Features**, **Maps & Data**, and **Teaching Climate**, with the Resilience Toolkit and Fifth National Climate Assessment linked as adjacent resources [1], [2]. Its strongest transferable idea is not any individual chart. It is the packaging around the chart: orient the visitor by purpose, teach the minimum concepts needed to use the data, expose a record-level source trail, and provide a path from reading to action.

The site is more accessible than a raw data repository, but the user's criticism is valid at the deeper **Maps & Data** layer. The section mixes image galleries, interactive maps, dashboards, dataset records, NOAA services, external GIS applications, projections, and teaching-adjacent materials. A first-time visitor still needs to know whether they want a story, a map, a dataset, a dashboard, or a lesson before the catalog becomes useful. Climate.us itself describes the collection as more than 280 dataset and service descriptions, while the currently visible Dataset Gallery presents 44 results across four pages [2], [4]. Breadth improves findability for known needs but increases orientation cost for everyone else.

Carbon ACX should **borrow the information architecture, not the subject breadth**:

1. Keep the existing traceable calculation as the primary product interaction.
2. Add a clearer question-first front door: learn, estimate, or inspect evidence.
3. Turn each published factor into a small, plain-language record with provenance, boundary, and a worked example.
4. Add a compact context/teaching layer so a number is interpretable without becoming a general climate portal.
5. Publish generated-data updates and citation/reuse paths as first-class product surfaces.

No new backend or dependency is required for the first pass. The current static Next.js routes, generated JSON authorities, methodology page, Activity Atlas, and manifest verification are already suitable seams for these improvements.

## 1. Reconnaissance method and evidence boundary

Research was performed on 2026-08-04 using the live Climate.us and Our World in Data sites, their public HTML/text surfaces, accessible page structure, selected screenshots, RSS/sitemap surfaces, and the Carbon ACX repository. The primary Climate.us pages inspected were:

- Home and primary navigation [1].
- About, mission, editorial policies, and restoration scope [2].
- Maps & Data landing page and its visible tool/dataset cards [3].
- Climate Data Primer [5].
- Dataset Gallery and a representative dataset record [4], [6].
- Global Climate Dashboard [7].
- Sitemap and RSS feed directory [8], [9].

The OWID comparison used the CO₂ and Greenhouse Gas Emissions article/dataset surface, the public CO₂ dataset documentation, the ETL getting-started documentation, and the documented APIs [10]–[13]. Dynamic charts were treated as interface evidence, not independently re-derived scientific results. Counts and descriptions attributed to Climate.us are labelled as site-published claims; live catalogs can change.

## 2. What Climate.us is doing well

### 2.1 Purpose-led navigation

The top-level structure names a visitor's likely intent rather than exposing a database schema:

| Section | Primary job | Observed affordances |
| --- | --- | --- |
| News & Features | Understand climate science and implications | Explainers, Q&As, blogs, case studies, decision-maker content, event coverage, images, and videos |
| Maps & Data | Find, view, and use climate information | Tools and interactives, data snapshots, a primer, dashboard indicators, dataset gallery, and advanced external tools |
| Teaching Climate | Teach or learn | Learning activities, curriculum materials, multimedia, and professional-development pathways; the site notes that parts of this area are still being restored |
| Support and trust | Decide whether to rely on the resource | Mission, team, editorial policies, FAQs, sitemap, feeds, contact, and donation surfaces |

This is a useful distinction for ACX. “Calculator,” “Atlas,” “Methodology,” and “Artifacts” are accurate product names, but they describe system surfaces. They do not fully answer the first visitor question: **what am I trying to do?**

### 2.2 Question-led onboarding

The Climate Data Primer starts with questions such as “What's the difference between climate and weather?”, “How do scientists classify different types of climate?”, “How can I find or make climate maps or graphs?”, and “What questions can I answer with climate data?” [5]. It then connects climate data to recognizable decisions: planning an outdoor event, monitoring drought, understanding coastal risk, checking water supplies, and teaching students.

The lesson is to teach the **decision context before the control surface**. ACX can do the same without copying Climate.us subject matter: begin with “What can this estimate tell me?”, “What does a factor measure?”, “Which boundary am I using?”, and “What should I do when evidence is missing?”

### 2.3 Summary insight followed by inspectable detail

The Global Climate Dashboard presents a small set of indicators with a one-sentence interpretation, a compact visualization, and a “Learn more” path [3], [7]. This is a strong pattern for reducing the intimidation of a data-heavy page:

1. State the result in ordinary language.
2. Show the smallest useful visual.
3. Offer the detailed data, method, and source as the next layer.

ACX already has the calculation equivalent: its landing experience shows quantity × factor = annual estimate, then places scope, region, GWP horizon, vintage, uncertainty, factor ID, and citations in an evidence rail. The missing layer is a small explanation of **why the result matters** or **what it can and cannot support**.

### 2.4 Record-level data documentation

A Climate.us dataset record follows a repeatable editorial template. The representative NOAA Voices record answers:

- What the resource is.
- Where the data come from.
- What a visitor can do with the data.
- How to search or use the resource.
- Where to find data access, documentation, and technical material.
- The direct link and geographic coverage [6].

The template is more useful than a generic “source” link because it joins provenance to the user's next action. ACX should adapt this pattern to factor records rather than create a broad external-resource directory.

### 2.5 Human and educational context around technical material

Climate.us combines magazine-style writing, dashboards, maps, a primer, dataset records, and teaching resources under one recognizable public mission [1], [2]. That combination gives non-specialists multiple entry points without requiring them to start at a raw dataset. It also makes the site's audience explicit: the editorial policies distinguish public science communication, data users, and educators [2].

ACX's equivalent should remain narrower: a calculation story, a worked example, a methodology explanation, and an evidence record. It does not need a full newsroom or a general climate-science curriculum to gain the same accessibility benefit.

### 2.6 Durable publishing signals

Climate.us exposes a human-readable sitemap and multiple RSS feeds for content streams [8], [9]. OWID goes further: its CO₂ dataset is distributed as CSV, XLSX, and JSON, while its ETL documentation describes a public, reproducible data-processing system and APIs [10]–[13]. These are not merely developer conveniences. They make updates discoverable, citable, and reusable outside the interactive website.

ACX already generates static `calculator-data.json`, `catalog-data.json`, and `sources.json`, and it publishes immutable artifacts with manifest digests. The product gap is discoverability and explanation: a user should be able to find the current dataset version, understand what changed, cite it, and reuse it without reverse-engineering the repository.

## 3. Where Climate.us remains difficult for a non-specialist

### 3.1 The Maps & Data catalog is broad before it is personal

The landing page presents tools, snapshots, dashboard indicators, and advanced resources in one section [3]. The gallery adds search and region/climate-variable filters, but the initial view is still a list of resource titles and descriptions [4]. Many entries are links to external NOAA or GIS systems, so the visitor must understand both the topic and the type of resource before choosing well.

This is a **findability problem**, not a scientific-quality problem. The catalog is valuable for a user with a known question (“I need county projections” or “I need daily observations”), but it is less effective as an introduction to climate data. The lesson for ACX is to avoid expanding the Activity Atlas into a similarly broad inventory without adding an intent layer.

### 3.2 Mixed audiences create competing complexity levels

Climate.us serves the science-interested public, educators, researchers, scientists, resource managers, business users, and other citizens [2]. The site addresses this by splitting sections, but the Maps & Data area still brings together very different tasks. ACX has a comparable tension between household activities, Canadian systems, industrial layers, and provenance-heavy technical records. A single flat table would reproduce the problem.

ACX's current three-mode Atlas is the right direction. The next improvement is to make the mode choice explain a user's task, not only the taxonomy: **estimate a recognizable activity**, **inspect a system record**, or **study a modeled/industrial layer**.

### 3.3 Trust framing is strong but not automatically transferable

Climate.us explains its nonprofit successor relationship to Climate.gov, its mission, its editorial review policies, and its restoration work [2]. This is an important trust architecture for a public information institution. Carbon ACX should emulate the transparency—version, source, method, uncertainty, and review status—but must not imply Climate.us's institutional history, federal lineage, or editorial review model.

## 4. Carbon ACX baseline: strengths to protect

The current repository already contains several of the patterns worth borrowing:

- `apps/carbon-acx-web/src/app/page.tsx` has a traceable landing example and a two-way fork between building a worksheet and reading the evidence catalogue.
- `TraceEstimate.tsx` exposes the arithmetic and an evidence rail containing factor, scope, region, GWP horizon, vintage, uncertainty, factor ID, and citations.
- `src/app/explore/page.tsx` separates personal/household, Canadian systems, and industrial layers, then provides a category matrix, filters, a table, and a record-detail pane.
- The Activity Atlas distinguishes unavailable evidence from numeric zero and explains the data gap.
- `src/app/methodology/page.tsx` documents annual convention, regional preference, missing-data policy, benchmark basis, generated metadata, and comparison records.
- The web README defines static routes, generated data authorities, immutable artifacts, and the publication contract.
- `scripts/generate_web_calculator_data.py` is the existing deterministic seam for generating calculator, catalogue, and source authorities.

These are stronger provenance primitives than a general public portal needs. The adoption goal is therefore **translation and orientation**, not replacing the evidence-first core with editorial decoration.

## 5. Gaps and opportunities

| Gap relative to Climate.us/OWID | ACX consequence | Recommended response |
| --- | --- | --- |
| No dedicated primer or teaching path | New visitors must infer accounting concepts from the calculator and methodology page | Add a short “How to read a carbon estimate” primer and a few worked examples |
| Evidence is visible, but the record is still factor-centric | A visitor can verify a number but may not know what decision it supports | Add plain-language record fields: what it measures, where it comes from, what it can be used for, limitations, and example arithmetic |
| Context is present mainly as labelled benchmarks | An estimate can feel isolated from Canadian/system-level trends | Add one compact context block with an explicit basis, vintage, and “not a direct comparison” caveat |
| The front door names product surfaces more than user jobs | Visitors may choose the wrong path or avoid the Atlas | Reframe the first fork as learn / estimate / inspect while preserving current routes and deep links |
| Generated authorities and artifacts are technically reusable | External users may not know which version or URL to cite | Publish a small dataset/release index with version, generated date, source registry, artifact links, and citation instructions |
| No first-class teaching/resource workflow | Educators have to assemble their own examples from the app | Add static lesson cards or case studies using the same generated records; do not add an LMS or account system |

## 6. Prioritized adoption plan

### P0 — Orientation and interpretation

These changes fit the existing static architecture and should precede any catalog expansion.

1. **Add a job-based front door.** Keep the current trace estimate, but present three explicit paths: “Learn how a number is made,” “Estimate an activity,” and “Inspect the evidence.” Link each to existing methodology, calculator, and Atlas surfaces.
2. **Add the primer.** Extend the methodology route with short question-led sections: activity × factor, annual convention, boundary, region/vintage, uncertainty, and missing evidence. Use one worked school-run example already present in the landing experience.
3. **Add factor record guidance.** Extend the existing detail pane or introduce a small reusable record view with the Climate.us-style fields: plain-language description, data origin, appropriate use, boundary, region, vintage, uncertainty, source links, and worked arithmetic.
4. **Add one context block to results.** Where a compatible benchmark exists, show a concise “Why this matters” note with the benchmark basis and a direct link to methodology. Never mix territorial, consumption-based, equity, or incompatible unit comparisons.

### P1 — Civic and teaching reuse

1. Add three worked case studies—household activity, small organization, and Canadian system—using published records only.
2. Add a printable/downloadable worksheet or citation card generated from the same result and manifest data.
3. Add an educator landing page with learning objectives, a guided activity, and a verification prompt. Keep it static and source-backed.
4. Add an update/release page or machine-readable release index that exposes dataset version, generated timestamp, source changes, and artifact digests.

### P2 — Selective ecosystem connections

1. Document stable URLs for generated JSON, immutable artifacts, manifests, and source records.
2. Add a lightweight feed or changelog only if dataset updates become regular enough to justify one.
3. Add carefully selected external context links—OWID for macro trends and Climate.us for public climate-science primers—without turning ACX into an unowned directory.
4. Consider a public request/feedback path for missing factors and data gaps, with review status visible in the catalogue.

## 7. What Carbon ACX should not copy

- **Do not become a general climate portal.** Climate.us covers hazards, weather, projections, teaching, news, and public climate literacy. ACX's defensible job is auditable activity-level carbon estimation and evidence literacy.
- **Do not copy a large external-link catalog.** A longer list of maps and services would increase the exact nerdiness and orientation burden the reconnaissance was meant to address.
- **Do not bury the arithmetic under storytelling.** The quantity × factor calculation, data availability state, and source trail are the product's trust mechanism.
- **Do not merge incompatible comparison bases for visual simplicity.** Existing ACX policy correctly keeps territorial/production-based benchmarks separate from consumption and equity measures.
- **Do not claim institutional authority by association.** Climate.us's Climate.gov history and editorial-review model are its own provenance, not ACX's.
- **Do not add accounts, a CMS, or a backend to solve a content problem.** Static content, generated JSON, and existing manifest infrastructure are sufficient for the first adoption pass.

## 8. Decision

Carbon ACX should adopt a **three-layer public experience**:

1. **Understand:** a short question-led explanation of what the estimate measures and why the boundary matters.
2. **Estimate:** the existing transparent calculator, with a small compatible context note.
3. **Inspect and reuse:** a factor/evidence record, source links, immutable artifact or manifest, and a citation/download path.

Climate.us demonstrates how to make trustworthy climate information feel like a public service rather than a database. OWID demonstrates how to make the underlying data reusable and reproducible. Carbon ACX should combine those lessons at its narrower organizational-carbon scope: public orientation on top, auditable calculation in the middle, and machine-readable provenance underneath.

The immediate implementation target is not more data. It is reducing the number of concepts a new visitor must understand before they can successfully read one estimate and verify it.

## 9. CLI and machine-interface potential

### 9.1 OWID is the viable automation target

OWID exposes a documented public Chart API using stable URL patterns such as `https://ourworldindata.org/grapher/{chart-id}.csv` and `.json`, and its ETL documentation describes both `etl run --dry-run ...` and `uv run etl run ...` workflows [11]–[15]. The ETL repository also documents `owid-catalog` and a Python `Client().tables.fetch(...)` path for reading catalog tables [14]. This is sufficient for an ACX **offline context-ingestion workflow**.

The safe integration shape is:

1. Select a small allowlist of OWID charts whose accounting basis is compatible with a specific ACX context use.
2. Fetch CSV/JSON during an explicit generation or update command, never during a visitor calculation.
3. Record chart ID, source URL, fetched timestamp, dataset vintage, license/attribution, accounting basis, and a content digest.
4. Generate a static context payload alongside the existing calculator/catalogue/source authorities.
5. Show the context payload only where its units, geography, period, and territorial/consumption basis are labelled.

This gives ACX a reproducible benchmark layer without making the web app dependent on OWID availability or silently changing historical results when an upstream chart updates. The full OWID ETL is not an appropriate ACX runtime dependency; ACX should consume selected published outputs, not attempt to reproduce OWID's entire data-processing graph.

The existing ACX seams are enough for a first implementation: `calc/derive.py` already exposes export/intensity commands and backend selection, while `scripts/generate_web_calculator_data.py` is the web authority generator. A future command should extend the generation pipeline with a pinned reference-data manifest rather than add live API calls to the calculator.

### 9.2 Climate.us is a link-and-learning integration target

No documented Climate.us CLI or general-purpose public data API was found in this reconnaissance. The machine-readable/publicly indexable surfaces observed were the human-readable sitemap, RSS feed directory, and record-level direct links [8], [9]. The Maps & Data pages often describe or link to NOAA and external GIS tools rather than expose a single Climate.us-owned table endpoint [3], [4].
That makes Climate.us useful to ACX as:

- a curated link from an ACX primer to plain-language climate-data concepts;
- a source of teaching/resource references for a future education page;
- an example of record-level editorial metadata and public navigation;
- an optional feed to monitor for relevant explanatory content, if a clear editorial use emerges.

It is **not** a safe target for scraper-driven calculator inputs. ACX should not scrape page HTML, embedded chart configuration, or external tools into emission factors. Climate.us references belong in curated content/source records with explicit access dates and no claim that Climate.us supplies ACX's calculation factors.

### 9.3 CLI decision

Prioritize an OWID-backed, offline, digest-pinned context-generation command only after the P0 orientation and factor-record work. Do not add a Climate.us scraper or make either reference site a runtime dependency. The CLI contract should preserve the existing ACX invariants: deterministic output, explicit basis, source citation, and unavailable rather than zero when a required input cannot be verified.

## 10. Verification notes and limitations


- The live Climate.us interface exposed keyboard/accessible navigation for the main sections, search, indicator filters, and resource links. The default cookie-consent overlay can obscure part of the initial viewport until dismissed; this was treated as a site-state observation, not a product recommendation.
- The Climate.us home and Maps & Data pages visibly combine editorial cards, indicator summaries, interactive tools, and dataset/resource links. The Dataset Gallery currently displayed 44 results over four pages during this pass; the “more than 280 descriptions” figure is the site's own editorial-policy description of the wider Maps & Data collection [2], [4].
- Climate.us RSS and sitemap surfaces were reachable, but the text reader rendered the highlights RSS entries without titles. The existence of the feed directory and sitemap is still directly observable [8], [9].
- OWID's current public chart metadata and CSV endpoint were reachable during the pass; current values and metadata are time-sensitive and should be re-fetched before any ACX benchmark is derived from them.
- A local `python3 -m calc.derive intensity --help` smoke check could not start because the checkout environment lacks the `pandas` dependency. This did not affect the live-site reconnaissance or the repository-structure comparison, but it means the local Python CLI was not independently exercised here.

## References

[1] Climate.us, “Climate.us Home,” [Online]. Available: https://www.climate.us/. Accessed: Aug. 4, 2026.

[2] Climate.us, “About Climate.us,” [Online]. Available: https://www.climate.us/about. Accessed: Aug. 4, 2026.

[3] Climate.us, “Maps & Data,” [Online]. Available: https://www.climate.us/maps-data. Accessed: Aug. 4, 2026.

[4] Climate.us, “Dataset Gallery,” [Online]. Available: https://www.climate.us/maps-data/dataset-gallery. Accessed: Aug. 4, 2026.

[5] Climate.us, “Climate Data Primer,” [Online]. Available: https://www.climate.us/maps-data/climate-data-primer. Accessed: Aug. 4, 2026.

[6] Climate.us, “NOAA Voices - Oral History Archives,” [Online]. Available: https://www.climate.us/maps-data/dataset/noaa-voices-oral-history-archives. Accessed: Aug. 4, 2026.

[7] Climate.us, “Global Climate Dashboard,” [Online]. Available: https://www.climate.us/climatedashboard. Accessed: Aug. 4, 2026.

[8] Climate.us, “Sitemap,” [Online]. Available: https://www.climate.us/sitemap. Accessed: Aug. 4, 2026.

[9] Climate.us, “Feeds,” [Online]. Available: https://www.climate.us/feeds. Accessed: Aug. 4, 2026.

[10] Our World in Data, “CO₂ and Greenhouse Gas Emissions,” [Online]. Available: https://ourworldindata.org/co2-and-other-greenhouse-gas-emissions. Accessed: Aug. 4, 2026.

[11] Our World in Data, “Data on CO₂ and Greenhouse Gas Emissions,” [Online]. Available: https://raw.githubusercontent.com/owid/co2-data/master/README.md. Accessed: Aug. 4, 2026.

[12] Our World in Data, “Getting started - ETL,” [Online]. Available: https://raw.githubusercontent.com/owid/etl/master/docs/getting-started/index.md. Accessed: Aug. 4, 2026.

[13] Our World in Data, “APIs - ETL documentation,” [Online]. Available: https://docs.owid.io/projects/etl/api/. Accessed: Aug. 4, 2026.
[14] Our World in Data, “First steps - ETL,” [Online]. Available: https://raw.githubusercontent.com/owid/etl/master/docs/getting-started/building-datasets.md. Accessed: Aug. 4, 2026.

[15] Our World in Data, “ETL CLI,” [Online]. Available: https://raw.githubusercontent.com/owid/etl/master/docs/guides/etl-cli.md. Accessed: Aug. 4, 2026.
