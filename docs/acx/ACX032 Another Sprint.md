Love it. Yes to tighter labels + denser layout, and yes to a 33/66 split with **References below the viz**. Here’s a clean next sprint you can paste into Codex Cloud.

⸻

**CDX023 — Layout refactor: 33/66 grid + references below viz**

**Title:** app(ui): switch to 33/66 layout; move References under Visualization Canvas

**Intent:** Maximize data density; controls left (33%), visualizer right (66%), references directly beneath the visualizer (full width of the 66% column).

**Do:**

	•	Replace current container with CSS grid:

	•	grid-template-columns: 1fr 2fr; grid-gap: 12px; (desktop ≥1024px).

	•	Tablet (≥768px <1024px): 40/60.

	•	Mobile: single column; references collapsible under charts.

	•	Controls pane (left): sticky at top: 12px.

	•	Visualization pane (right): chart stack + **References** panel underneath (accordion default “open” on desktop, “closed” on mobile).

	•	Remove any card borders; use 8px spacing scale; internal padding 8–12px max.

**Acceptance:**

	•	Desktop shows left controls (33%), right charts (66%), references directly below charts.

	•	Mobile collapses into one column, no horizontal scroll.

⸻

**CDX024 — Typography & label tightening**

**Title:** app(ui): compact typographic scale and axis/legend comps

**Intent:** Fit more info without clutter.

**Do:**

	•	Add CSS vars: --step-0:12px; --step-1:13px; --step-2:15px; --step-3:18px.

	•	Axis labels = var(--step-0), tick labels = 11px, legend = 12px with max 1 line + ellipsis + tooltip on hover.

	•	Reduce Plotly margins (l/r/t/b = 8–12), legend.orientation='h', wrap into two rows if overflow.

	•	Tighten card headers to line-height: 1.2, remove superfluous subtitles.

**Acceptance:** Compared to current, chart area increases ≥10% (less margin), no text wrapping beyond 1 line in legends.

⸻

**CDX025 — “Dense mode” toggle (global)**

**Title:** app(ui): add density switch (Comfort / Dense) stored in localStorage

**Intent:** Let power users squeeze maximum on-screen info.

**Do:**

	•	Add toggle in header.

	•	Dense mode sets: grid-gap: 8px; padding: 8px; font-size -1 step; Plotly marker size -20%; bar gap 0.1.

	•	Persist to localStorage, apply on load.

**Acceptance:** Toggle immediately reflows; setting is remembered.

⸻

**CDX026 — Microcopy & tooltip polish**

**Title:** app(copy): concise labels, smart axis units, rich tooltips

**Intent:** Clarity without extra pixels.

**Do:**

	•	Abbreviate units to g/FU, kg/yr, pkm, h (with a small legend explaining once).

	•	Tooltips show: name, intensity_g_per_fu with ± bounds, scope, region, source id list [n].

	•	Format large numbers with thin spaces (12 345).

**Acceptance:** Tooltip < 6 lines; axis labels never overlap.

⸻

**CDX027 — Mobile ergonomics**

**Title:** app(ui): mobile-safe controls and charts

**Intent:** Your screenshots show phone use—fix it.

**Do:**

	•	Increase tap targets to ≥40px height for sliders/toggles.

	•	Make the References accordion default to **closed** on mobile.

	•	Ensure charts use responsive: true with useResizeHandler.

**Acceptance:** No horizontal scroll; controls usable with thumb.

⸻

**CDX028 — Render performance & debouncing**

**Title:** app(perf): debounce control changes and virtualize long lists

**Intent:** Prevent jank as density rises.

**Do:**

	•	Debounce “Profile Controls” inputs (200–300 ms).

	•	Virtualize any select/list > 30 items (react-window).

	•	Memoize parsed CSV/JSON artifacts.

**Acceptance:** 60fps scroll on desktop; no noticeable lag when dragging sliders.

⸻

**Data expansion (real, citable)**

You asked for strictly citable data (no dummy values). These prompts wire that in.

**CDX029 — Ontario electricity & urban transit intensities (citable)**

**Title:** data(ef): add CA-ON grid intensity + TTC subway/bus p-km EFs with IEEE citations

**Intent:** Populate verified EFs needed for person-km comparisons in Toronto.

**Do:**

	•	sources.csv: add entries for **IESO annual emissions reports** (grid intensity) and **transit agency/academic LCA** for subway/bus p-km.

	•	emission_factors.csv:

	•	GRID.CA-ON.2024 → g_per_kWh with year + source.

	•	EF.TTC.SUBWAY.PKM → g/p-km derived from electricity×occupancy; show derivation in method_notes.

	•	EF.TTC.BUS.PKM → g/p-km (diesel or hybrid) with source + uncertainty if available.

**Acceptance:** Intensity leaderboard shows non-zero bars for subway/bus person-km; references list renders these source IDs.

Note: keep **null-first** discipline: if occupancy is uncertain, set a documented default and include low/high bounds where the source allows.

⸻

**CDX030 — Streaming: device mix + hour EFs (citable)**

**Title:** data(ef): add per-hour streaming intensities (HD/UHD) with device mix and electricity region

**Intent:** Show real trade-offs users care about (phone vs TV, HD vs UHD).

**Do:**

	•	sources.csv: add peer-reviewed or reputable tech-sector studies for streaming energy (device, network, DC).

	•	emission_factors.csv:

	•	EF.STREAM.HD.HOUR.CA-ON, EF.STREAM.UHD.HOUR.CA-ON with low/mean/high.

	•	method_notes must state assumed device mix (e.g., 60% TV, 30% laptop, 10% phone) and PUE assumptions.

**Acceptance:** Intensity tab (FU.VIEW_HOUR) shows distinct HD vs UHD bars with bounds; refs include the added studies.

⸻

**CDX031 — Food baseline (citable)**

**Title:** data(ef): add meals EFs (beef/chicken/veg) with uncertainty from meta-analyses

**Intent:** Provide dietary comparison that’s defensible.

**Do:**

	•	sources.csv: meta-analysis (e.g., Poore & Nemecek 2018) + any Canada-specific adjustments if you have them.

	•	emission_factors.csv:

	•	EF.MEAL.BEEF.SERVING (serving-based), EF.MEAL.CHICKEN.SERVING, EF.MEAL.VEG.SERVING with bounds.

	•	activity_fu_map.csv: map meals to FU.NUTRITIONAL_SERVING (add FU if missing).

**Acceptance:** FU selector shows **Nutritional serving** with ≥3 bars and citations.

⸻

**CDX032 — Corporate delivery slice (citable)**

**Title:** data(ef): add Class-5/6 urban delivery truck EFs and one modeled operation

**Intent:** Make the big-player comparison real.

**Do:**

	•	sources.csv: add EPA/NRCAN/peer-reviewed fuel intensity for Class-5/6 urban delivery; include uncertainty if available.

	•	emission_factors.csv: EF.TRUCK.CLASS6.KM (g/km) + optional kWh/km for an e-truck scenario.

	•	operations.csv: fill throughput for OP.COKE.DELIVERY.URBAN_2025 (route_km, drops, litres delivered); put assumptions in notes.

**Acceptance:** Intensity (FU.LITRE_DELIVERED) shows at least one corporate operation row with non-null intensity; refs list the truck source.

⸻

**Quick design notes on your 33/66 idea**

	•	I’m for it. Put **controls** in the 33% column (sticky), and stack **charts + references** in the 66% column.

	•	References belong **right under** the viz: you want the evidence within the user’s eye line, not hidden. On mobile, default it closed to save space.

	•	The density toggle (CDX025) gives you both worlds: client-friendly by default, nerd-dense on demand.

If you want, I can also add a **CDX033** to implement a “mini-references” strip directly under chart titles (e.g., “Based on [3] [7] [12]”) that expands to the full list below—keeps provenance visible without stealing vertical space.