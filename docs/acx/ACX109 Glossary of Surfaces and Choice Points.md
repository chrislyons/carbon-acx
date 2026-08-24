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
| 1 | **Header (persistent navbar)** | `Header.tsx:34‑38` – theme‑switcher button | `Light` / `Dark` | Toggles global light/dark theme for the whole site. |
| 2 | **Calculator** | `CalculatorPage.tsx:166‑178` – category‑button rail | One button per `ActivityCategory` (transport, food, digital, …) with label *“n activities”* | Sets `activeCategory` state; filters the activity shelf and all downstream computations. |
| 3 | **Calculator** | `CalculatorPage.tsx:95‑96` – benchmark selector | Options returned by `getBenchmarkOptions()` (default + any custom benchmarks) | `benchmarkKey` drives the benchmark comparison shown in `ResultPanel`. |
| 4 | **Calculator** | `CalculatorPage.tsx:97‑112` – activity‑tile toggle | Each activity tile has a “+ Add” / “‑ Remove” button; selected IDs accumulate in `selectedIds` | User builds the worksheet’s activity list; the `ResultPanel` only includes selected activities. |
| 5 | **Explore (Atlas)** | `ExplorePage.tsx:16` – mode state | `personal`, `systems`, `industrial` (radio‑style tabs) | Switches the underlying catalogue slice (`personal` = calculator‑eligible, `systems` / `industrial` = broader layers). |
| 6 | **Explore (Atlas)** | `ExplorePage.tsx:19‑21` – filter states | `category` (dropdown of all categories found in the current mode), `region` (all / specific region), `status` (`published`, `unavailable`, `all`) | Narrows the record list displayed in the atlas table; each filter updates the `filtered` memo. |
| 7 | **Explore (Atlas)** | `ExplorePage.tsx:17‑18` – record selection | Clicking a table row selects a single `CatalogActivity`; the `DetailPane` opens for that record | Determines which record’s evidence metadata is shown in the right‑hand detail view. |
| 8 | **Learn** | `LearnPage.tsx:15‑34` – case‑study cards | Each card represents a distinct `LearningRecord` (e.g., school‑run, home‑energy); clicking navigates to calculator or explore with pre‑filled quantities | User chooses which scenario to explore further. |
| 9 | **Methodology** | `MethodologyPage.tsx:23` – benchmark options | List from `getBenchmarkOptions()` displayed in the “Benchmarks” section | User can view results relative to a chosen benchmark; the section toggles the active benchmark. |
|10| **3‑D Visualization** | `ThreeDVisualizationPage.tsx:15‑16` – reduced‑motion toggle | `true` / `false` for reduced‑motion preference; also implicit mode based on selected activity category | Controls whether the WebGL canvas respects the user’s reduced‑motion setting. |
|11| **Result Panel (Calculator)** | `CalculatorPage.tsx:317‑379` – download / export format | Options: “Copy emissions”, “Download CSV”, “Share link” (shown as buttons) | User chooses how to export or share the computed result. |
|12| **Evidence Pane (Calculator)** | `EvidencePane.tsx:381‑411` – close action | Single button “Close” | Dismisses the source‑trail modal; not a list choice but included for completeness of “choice points” in the UI flow. |

---

## 3. How to Use This Glossary

- **Locate a surface**: Find the row by its panel number or path; the “Key Components” column points to the exact React components that render that surface.
- **Identify a choice point**: Match the UI description (or the code‑anchor line number) to the exact state variable or prop being set; the “What the choice controls” column explains the downstream effect.
- **Cross‑panel impacts**: Changing a choice (e.g., mode in Explore, row 5) re‑computes memos (`records`, `filtered`) and re‑renders dependent UI (atlas table, 3‑D globe, result panel).
- **Design‑system consistency**: All category buttons share the `category-button` CSS rules (see `category-button` at line 770‑816); mode switches use the same `mode-switcher` pattern in Header and Explore.

---

*Compiled on 2026‑08‑24 for the Carbon ACX repository. This file follows the workspace documentation naming convention `ACX### Glossary of ….md` and is stored under `docs/acx/`.*