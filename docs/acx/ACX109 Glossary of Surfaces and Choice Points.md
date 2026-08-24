Version: 2.0.0

# ACX109 — Glossary of Surfaces and Choice Points

## Purpose

This document provides a concise, indexed reference for every **frontend surface (panel)** and **user choice point** in the Carbon ACX web application. It is intended as a quick‑lookup guide for developers, designers, and reviewers who need to locate a specific UI area or the exact decision the user must make there.

---

## 1. Surfaces (frontend panels / pages)

| # | Panel / Surface | Path / Entry Point | Primary Function | Key Components |
|---|-----------------|--------------------|------------------|----------------|
| 1 | **Homepage (Editorial Landing)** | `/` | Introductory “jobs” section guiding users to the three core ways to engage: *Understand, Estimate, Inspect*. | `TraceEstimate`, three `<article>` cards, CTA links to `/methodology`, `/calculator`, `/explore` |
| 2 | **Header (Persistent Navbar)** | Top of every page | Site‑brand, primary navigation, theme toggle, mobile menu. | `Header.tsx` – links: Home, Calculator, Explore, Learn, Methodology; theme switcher; mobile nav |
| 3 | **Calculator Surface** | `/calculator` | Interactive annual‑worksheet builder; select activities, input quantities, see real‑time emissions results. | `CalculatorPage` – `CalculatorContent`, `CategoryTally`, `ActivityEditor`, `ResultPanel`, `EvidencePane` |
| 4 | **Learn Surface** | `/learn` | Curated case‑studies / learning cards that walk users through representative carbon‑estimate scenarios, with embedded calculator links. | `LearnPage` – `LearningCard`, CASE_STUDIES data, `SourceList`, worked‑emission calculations |
| 5 | **Explore Surface (Atlas)** | `/explore` | Browse the full activity catalogue with layered filtering (mode, category, region, publication status). Supports a tabular view and a detail pane per record. | `ExplorePage` – `AtlasFilters`, `AtlasTable`, `DetailPane`, `AtlasCoverageMap` |
| 6 | **3‑D Visualization Surface** | `/explore/3d` | Interactive WebGL globe that visualizes computed emissions by activity category and lets users select individual records. | `ThreeDVisualizationPage` – WebGL canvas, `DataUniverse` component, reduced‑motion handling |
| 7 | **Methodology Surface** | `/methodology` | Documented “published‑data contract”: primer example, benchmark definitions, source‑link evidence grid, and reference panels. | `MethodologyPage` – `Eyebrow`, primer card, `methodology‑grid`, multiple `reference‑panel` sections |
| 8 | **Manifests / Evidence Library Surface** | `/manifests` | Static‑file manifests (hash‑verified figures) that can be inspected or downloaded for audit purposes. | `ManifestsPage` – `Eyebrow`, manifest list cards with `figure_id`, `figure_path`, `hash_prefix` |
| 9 | **Footer (Persistent Reference Strip)** | Bottom of every page | Quick‑access navigation to core reference sections and the GitHub repository. | `Footer.tsx` – links: Methodology, Evidence library, Raw artifacts, Repository |
|10| **Learn Case‑Study Cards** (subset of Learn) | Within `/learn page` | Individual cards each representing a worked carbon‑estimate scenario (e.g., school run, home energy). | `LearningCard` component – fetches activity by ID, computes emissions, displays quantity, emissions, CTA |
|11| **Methodology Sub‑sections** (within `/methodology page`) | Within `/methodology page` | *Primer card* (single‑activity walkthrough), *Methodology grid* (macro overview), *Reference panels* (sources, citations, benchmarks), *Benchmarks* section. | Primer card, grid layout, reference‑panel blocks, benchmark options |
|12| **Explore Atlas Filters** (subset of Explore) | Within `/explore page` | Controls that narrow the catalogue: mode (personal/systems/industrial), category, region, publication status. | `AtlasFilters` – mode buttons, category dropdown, region selector, status toggles |
|13| **Explore Table View** (subset of Explore) | Within `/explore page` | Tabular display of filtered catalogue records with selectable rows that feed the `DetailPane`. | `AtlasTable` – renders rows of activity records, onSelect → `DetailPane` |
|14| **Detail Pane** (subset of Explore) | Within `/explore page` (and other surfaces) | Expands to show record‑level boundary, geography, vintage, uncertainty, source links for a selected catalogue activity. | `DetailPane` – displays evidence metadata, source citations, action buttons |
|15| **Result Panel** (subset of Calculator) | Within `/calculator page` | Shows total emissions, per‑activity breakdown, benchmark comparison, and download / export options. | `ResultPanel` – summary object, benchmarkKey, evidenceId display |
|16| **Evidence Pane** (subset of Calculator) | Within `/calculator page` | Modal / side panel that reveals the source‑trail for a given activity factor (factor ID, source IDs, citation URLs). | `EvidencePane` – activity prop, quantity, close handler; renders source list and citations |

---

## 2. Choice Points (user‑selected items from lists / toggles)

| # | Panel / Surface | UI element (code anchor) | Choice options presented | What the choice controls |
|---|-----------------|--------------------------|------------------------|--------------------------|
| 1 | **Homepage** | `TraceEstimate.tsx:37‑43` – annual-distance input | A positive annual distance | Sets the prefilled school-run estimate and the calculator continuation link. |
| 2 | **Homepage** | `app/page.tsx:14‑39` – three job-path links | Understand / Estimate / Inspect | Chooses the user’s initial route: Methodology, Calculator, or Atlas. |
| 3 | **Header** | `Header.tsx:25‑39` – primary nav and theme control | Five routes; Light / Dark | Changes route or global colour theme. These are utility choices, not part of the estimate narrative. |
| 4 | **Calculator** | `calculator/page.tsx:178‑193` – category rail | One `ActivityCategory` at a time | Sets `activeCategory`, which changes the visible activity shelf. |
| 5 | **Calculator** | `ActivityShelf.tsx` plus `calculator/page.tsx:111‑128` – add/remove activities | Any number of published activity records | Builds the worksheet list in `selectedIds`. |
| 6 | **Calculator** | `calculator/page.tsx:303‑315` – annual-quantity field | A positive quantity per selected activity | Sets each record’s calculated contribution. This is essential input, not a list choice. |
| 7 | **Calculator** | `calculator/page.tsx:383‑387` – comparison-basis select | Options from `getBenchmarkOptions()` | Changes the contextual comparison in `ResultPanel`; it does not alter the estimate. |
| 8 | **Calculator: AI research layer** | `ScenarioPane.tsx:99‑114` – AI-activity select | Documented AI activities | Determines which scenario records are eligible for the next select. |
| 9 | **Calculator: AI research layer** | `ScenarioPane.tsx:115‑130` – scenario select | Documented scenarios for the selected AI activity | Resolves the exact evidence record; only published scenarios contribute to the total. |
|10| **Calculator: AI research layer** | `ScenarioPane.tsx:131‑145` – scenario quantity | A positive annual quantity | Calculates the selected published AI scenario’s contribution. |
|11| **Explore (Atlas)** | `explore/page.tsx:48‑52` – catalogue-mode switch | Personal / household; Canadian systems; Industrial layers | Selects the catalogue layer and resets the three filters. |
|12| **Explore (Atlas)** | `explore/page.tsx:96‑100` – filter toolbar | Category, Region, and Publication selects | Narrows records inside the active mode. |
|13| **Explore (Atlas)** | `explore/page.tsx:64, 113` – coverage-map or table record selection | Any currently displayed record | Opens that record’s detail/evidence pane. |
|14| **Explore (Atlas)** | `explore/page.tsx:67‑70` – “Data table” disclosure | Show / hide the tabular representation | Reveals an alternative, accessible record-browsing surface; it does not change data. |
|15| **Learn** | `learn/page.tsx:15‑34, 119‑121` – three worked-example CTAs | Household school travel; small-office area; Canadian-system electricity | Opens the selected example in Calculator or Atlas. |
|16| **3‑D activity lab** | `explore/3d/page.tsx:72‑78, 96‑102` – sphere or “Inspect evidence” selection | Any result already present in the worksheet | Opens evidence for one calculated record. Reduced-motion is detected from system preference, not chosen in this UI. |

---

## 3. How to Use This Glossary

- **Locate a surface**: Find the row by its panel number or path; the “Key Components” column points to the exact React components that render that surface.
- **Identify a choice point**: Match the UI description (or the code‑anchor line number) to the exact state variable or prop being set; the “What the choice controls” column explains the downstream effect.
- **Cross‑panel impacts**: Changing a choice (e.g., mode in Explore, row 5) re‑computes memos (`records`, `filtered`) and re‑renders dependent UI (atlas table, 3‑D globe, result panel).
- **Design‑system consistency**: All category buttons share the `category-button` CSS rules (see `category-button` at line 770‑816); mode switches use the same `mode-switcher` pattern in Header and Explore.

---

*Compiled on 2026‑08‑24 for the Carbon ACX repository. This file follows the workspace documentation naming convention `ACX### Glossary of ….md` and is stored under `docs/acx/`.*