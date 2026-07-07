---
source: standard-notes
sn_filename: "ACX055 Sprint Plan (ACX‑CDX‑081…088)-a79dd688.txt"
prefix: acx
original_format: lexical
imported: 2026-05-01
status: archive
related:
  - ACX
---

# ACX051 Sprint Plan (ACX‑CDX‑081…088)



All prompts: **Constraints** — density-first, deterministic manifests, WCAG 2.2 AA, no binaries, no `node:*` in client. Node/pnpm pinned in CI. Budgets: **LCP ≤2.5s**, **CLS <0.1**.




---




## ACX‑CDX‑081 — Implement Split‑Pane Shell



**Intent:** Create grid shell with resizable left/right rails, dbl‑click reset, keyboard resize.



**Paths:** `site/src/routes/(app)/shell.tsx`, `site/src/hooks/useShellLayout.ts`, `site/src/theme/tokens.ts`.



**Do:**



1) Add `useShellLayout()` to persist sizes (localStorage + media defaults).



2) Build CSS grid: header / body / footer; body has three resizable panes.



3) Mouse drag + dbl‑click reset; keyboard Alt+Arrows resize 2% steps.



4) Footer KPI strip (single line); header ≤64px.



**Tests:**



- RTL: resize via keyboard/mouse; dbl‑click reset.
- Axe: no violations; focus order respects DOM landmarks.
- Perf: route bundle <250KB gz (excl. plot libs).




---




## **ACX-CDX-082 — Omni Browser + Command Palette (Navigation Stack)**



**Intent:**

Deliver the full navigation experience from both rails and keyboard — virtualized Omni Browser tree with scoped search **and** ⌘K Command Palette. Both drive the same deterministic state and deep links.



**Paths:**

`site/src/components/OmniBrowser/**`,

`site/src/components/CommandPalette.tsx`,

`site/src/hooks/useDeepLink.ts`,

`site/src/theme/tokens.ts`,

`site/src/**/__tests__/nav.*.test.tsx`.



**Do:**



1. **Virtualized Omni Tree** —

- - Use `@tanstack/react-virtual` or similar for 5k+ nodes.
- Keyboard: ↑↓ select, ← collapse, → expand, Enter open, ⇧Enter focus main pane.
- Deterministic `[n]` index; lazy-load children; show refs badge count.
- Scoped search (Entities/Layers/Activities/Figures/Scenarios/Refs).

1. **Command Palette (⌘K)** —

- - Opens modal (`role="dialog"`, aria-modal).
- Fuzzy search over same data source as Omni Browser.
- Actions: open layer/activity/figure/scenario, toggle rails, toggle focus mode.
- From `/`, any entity reachable in ≤2 actions (filter → open).
- Lazy-load under 30 KB gz.

1. **Deep Link Integration** —

- - `useDeepLink` serializes current pane state and selected IDs into URL params.
- On mount, parse query to restore selection. SSR-safe (check `typeof window`).



**Tests:**



- RTL: tree renders, filters, arrow-nav + open/focus; palette opens, executes commands.
- Axe: roles/aria-selected valid on tree & dialog.
- Perf: virtualization ≤50 ms render for 5 k nodes; palette lazy bundle < 30 KB.




---




## **ACX-CDX-083 — Context Rail + Visualizer (Tabs, Focus Mode, Dock)**



**Intent:**

Implement the right-pane **ContextRail** with tabbed panels and a deterministic **VisualizerSurface** that supports Focus Mode and a secondary dock. All tabs deep-linkable (`view=` param).



**Paths:**

`site/src/components/ContextRail/**`,

`site/src/components/VisualizerSurface.tsx`,

`site/src/hooks/useShellLayout.ts`,

`site/src/theme/tokens.ts`,

`site/src/**/__tests__/context+viz.test.tsx`.



**Do:**



1. **ContextRail Tabs** —

- - Tabs: References ▸ Scenario ▸ Compare ▸ Chat ▸ Logs.
- Each tab lazy-loads; preserves scroll.
- Bind active tab to URL `view=refs|scenario|compare|chat|logs`.
- References tab shows manifest hash and refs list (deterministic order).

1. **VisualizerSurface** —

- - Dense Plotly theme (tight margins, compact legends, reduced motion).
- Focus Mode: expands to full screen, Esc exits, `view=focus` persisted.
- Secondary dock toggle (below/side) saved via `useShellLayout`.
- Dock loads second chart lazily; Plotly import deferred until open.

1. **Interaction glue** —

- - Focus toggle updates URL + store.
- Compare tab can open dock view for side-by-side.



**Tests:**



- RTL: tab switching retains scroll; focus toggle expands/hides rails; dock persists width/side.
- Axe: correct tab roles, roving tabindex.
- Perf: route interactions <200 ms; dock code-split chunk loads ≤10 KB extra.




---




## **ACX-CDX-084 — A11y, Performance & CI Hardening**



**Intent:**

Close gaps in accessibility, enforce budgets and test coverage, lock CI toolchain.



**Paths:**

`site/.github/workflows/ci.yml`,

`site/src/**`,

`site/scripts/perf-check.mjs`,

`site/src/theme/global.css` (skip links, focus rings).



**Do:**



1. **Accessibility polish** —

- - Add skip links, landmarks, aria-labels, and reduced-motion media query.
- Keyboard pane resize and traversal verified.
- axe-core smoke test across all routes.

1. **Performance budgets** —

- - Script `perf-check.mjs` runs Lighthouse (LCP ≤ 2.5 s, CLS < 0.1).
- CI fails on bundle > 250 KB gz or regression > 5 %.

1. **Tooling discipline** —

- - Pin Node/pnpm versions; strict TS/ESLint.
- Lint rule forbidding `node:*` in client bundles.
- Coverage ≥ 80 %.



**Tests:**



- axe: 0 critical violations; tab/keyboard traversal validated.
- perf-check: passes budgets in CI; Lighthouse JSON logged.
- ESLint: no forbidden imports; coverage thresholds met.




---




## **ACX-CDX-08**5 & **ACX-CDX-08**6 deprecated




---




## ACX-CDX-087 — Shell+Context refinements (single Refs toggle, Focus button position, brand to left, reclaim space)



**Title:** feat(shell+context): single References toggle in tab header; Focus button above right pane; brand header in left; tighten paddings



**Intent:**

Finalize the 3-pane shell per the screenshot/wireframe:



- Exactly **one** References show/hide control, **top-right inside References tab header**.
- **Enter Focus Mode** button sits **above** the right rail (just above the References tab header).
- **Brand header** moves to the **top of the left pane**; remove global top navbar.
- **Reclaim horizontal space** by reducing rail paddings via tokens so the **Scope**/main pane expands.



**Constraints:**

Density-first; deterministic manifests & refs; WCAG 2.2 AA; keyboard traversal incl. pane resize; no binaries; no `node:*` in client; interactions <200 ms; **CLS <0.1**; route JS <250 KB gz (excl. viz libs).



**Files (modify/add/remove):**



- **Modify**
- - `site/src/routes/(app)/shell.tsx`
- `site/src/components/ContextRail/ReferencesTab.tsx` *(tab header owns the only toggle)*
- `site/src/components/ContextRail/index.ts` *(export surface if needed)*
- `site/src/components/VisualizerSurface.tsx` *(ensure Focus uses store + deeplink)*
- `site/src/components/OmniBrowser/OmniBrowser.tsx` *(left header slot)*
- `site/src/theme/tokens.ts`
- `site/src/styles/index.css` (or `globals.css`) *(remove top navbar height if present)*
- **Add**
- - `site/src/components/BrandHeader.tsx`
- `site/src/components/FocusButton.tsx`
- **Remove**
- - Any duplicate References toggle buttons in center/right toolbars (list in PR).



**Do (step-by-step):**



1. **Kill global top navbar; install brand in left pane**

- - In `shell.tsx`, remove the top nav container entirely (keep header row height ≤64 px if any placeholder remains).
- Create `BrandHeader.tsx`:```javascript

export function BrandHeader() {

  return (

    <header role="banner" className="px-3 py-2 text-sm font-semibold select-none">

      Carbon ACX

    </header>

  );

}




```
    - In `OmniBrowser.tsx`, render `<BrandHeader />` at the very top of the left `<aside aria-label="Navigation">`.
2. **Single References toggle in References tab header**
    - In `ContextRail/ReferencesTab.tsx`, add a sticky tab header with **only one** toggle and a Copy icon area (Copy stays text-less; 088 will finalize icon-only globally):```javascript
<header className="sticky top-0 z-10 flex items-center justify-between px-2 py-1">
  <h2 className="text-sm font-medium">References</h2>
  <div className="flex items-center gap-2">
    {/* copy button stays; 088 will ensure icon-only everywhere */}
    <button aria-label="Copy manifest JSON" title="Copy JSON" className="icon-btn" onClick={copyJson}>
      <CopyIcon aria-hidden />
    </button>
    <button
      type="button"
      aria-controls="references-panel"
      aria-expanded={!rightCollapsed}
      onClick={() => setRightCollapsed(v => !v)} // see below
      className="icon-btn"
      title={rightCollapsed ? "Show references" : "Hide references"}
    >
      <ChevronDownIcon className={!rightCollapsed ? "rotate-180" : ""} aria-hidden />
    </button>
  </div>
</header>
<section id="references-panel" hidden={rightCollapsed} className="overflow-auto">
  {/* virtualized refs list */}
</section>
```

- - Wire `rightCollapsed` to **shell layout store**: `const { rightCollapsed, setRightCollapsed } = useShellLayout();`
- **Delete** any other Refs toggles: search and remove in `ContextRail.tsx`, `VisualizerSurface.tsx`, or header toolbars.

1. **Move Focus button above the right pane**

- - Add `FocusButton.tsx`:```javascript

export function FocusButton({ pressed, onToggle }:{

  pressed:boolean; onToggle:()=>void;

}) {

  return (

    <button

      type="button"

      className="icon-btn absolute -top-8 right-2" // visually above the rail

      aria-pressed={pressed}

      aria-label={pressed ? "Exit focus mode" : "Enter focus mode"}

      onClick={onToggle}

    >

      <MaximizeIcon aria-hidden />

    </button>

  );

}




```
    - In `shell.tsx` (right `<aside aria-label="Context">` container), render:```javascript
const { focusMode, setFocusMode } = useACXStore();
<FocusButton
  pressed={focusMode}
  onToggle={() => setFocusMode(!focusMode)}
/>
```

- - Ensure `VisualizerSurface.tsx` already binds focus mode to URL (`view=focus`) via `useDeepLink` (from 085). Do **not** add a second focus toggle elsewhere.

1. **Tighten paddings; reclaim space; Scope expands**

- - In `tokens.ts`, reduce rail gutters:```javascript

export const density = {

  padX: 8,  // was 12/16

  padY: 6,

  gap: 6,

};




```
    - Apply tokens in `OmniBrowser`, `ReferencesTab` containers (`px-[density.padX]` etc.).
    - In `shell.tsx`, ensure the main grid column grows; remove any leftover button cluster space holders. Verify center “Scope” region uses `w-full` and no phantom columns constrain width.
5. **A11y & focus order**
    - Left aside: `<aside aria-label="Navigation">` (brand header is inside, first tabbable after skip link).
    - Right aside: `<aside aria-label="Context">`.
    - References toggle: `aria-controls/aria-expanded` reflect `rightCollapsed`.
    - Focus button: `aria-pressed` reflects store value.

**Acceptance tests (Vitest + RTL + jest-axe):**

- **Uniqueness:** `screen.getAllByRole('button', { name: /references/i })` returns **1** (single toggle).
- **Focus button position:** In DOM order, `FocusButton` precedes the references header; has `aria-pressed` reflecting store.
- **Scope growth:** At **XL (≥1280px)**, main pane content width increases ≥160 px vs pre-change snapshot; no horizontal overflow.
- **Toggle behavior:** Clicking Refs toggle shows/hides `#references-panel` without main chart relayout (check CLS via layout snapshot—delta < 0.05).
- **Focus mode:** Toggling focus hides both rails; main = 100% width; URL contains `view=focus`; exit restores previous widths.
- **A11y:** axe has **0 serious** violations; `aria-expanded`/`aria-pressed` states correct.

**Performance budgets:**

- Refs toggle & focus handler ≤16 ms per interaction.
- No new deps; added code < **3 KB** gz.
- CLS overall remains **<0.1**; route JS remains **<250 KB** gz (excl. viz libs).

**CI notes:**

- Add tests under `site/src/routes/(app)/__tests__/shell.layout.test.tsx` and `context.refs-toggle.test.tsx`.
- ESLint rule verifies **no other** Refs toggles exist (optional custom rule or test query).
- Update screenshots/snapshots post navbar removal.

***

## ACX-CDX-088 — Omni & Scenario compaction (icon-only chips, single-row sectors, Activities→ACX, Copy JSON icon-only)

**Title:** refactor(omni+scenario): compact sector rows (●/○ + ACX/OPS one line); rename Activities→ACX; make Copy JSON icon-only

**Intent:**
Deliver the density fixes: each sector row uses **one line** with **status icon-only** (● rendered / ○ missing), label, and **ACX / OPS** counters aligned right. Rename “Activities” → **ACX** everywhere user-visible. Convert “Copy JSON” buttons to **icon-only** with tooltips. Keep virtualization and a11y.

**Constraints:**
Density-first; preserve virtualization; WCAG 2.2 AA (labels for icons); deterministic ordering; no `node:*` in client; interactions <200 ms.

**Files (modify/add):**

- **Modify**
    - `site/src/components/OmniBrowser/OmniBrowserRow.tsx` *(virtualized row renderer)*
    - `site/src/components/OmniBrowser/OmniBrowser.tsx` *(column header text “ACX”)*
    - `site/src/components/ContextRail/ScenarioTab.tsx` *(Copy JSON icon-only)*
    - `site/src/theme/tokens.ts` *(tabular-nums fontFeature, small gaps)*
- **Add**
    - `site/src/components/StatusChip.tsx`

**Do (step-by-step):**

1. **StatusChip (icon-only)**```javascript
// site/src/components/StatusChip.tsx
export function StatusChip({ state }:{ state:'rendered'|'missing' }) {
  const icon = state === 'rendered' ? '●' : '○';
  const label = state === 'rendered' ? 'Rendered' : 'Missing data';
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 text-xs leading-none"
      role="img"
      aria-label={label}
      title={label}
    >
      {icon}
    </span>
  );
}
```

1. **Single-row sector item**

- - In `OmniBrowserRow.tsx`, render a compact flex line; maintain virtualization keys:```javascript

<li

  data-id={node.id}

  role="treeitem"

  aria-level={node.level}

  aria-selected={isSelected}

  className="flex items-center justify-between gap-2 px-2 py-1"

>

  <div className="flex items-center gap-2 min-w-0">

    <StatusChip state={node.state /* 'rendered'|'missing' */} />

    <span className="truncate" title={node.label}>{node.label}</span>

  </div>

  <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">

    <span aria-label="ACX count">ACX {node.counts.acx}</span>

    <span aria-label="OPS count">OPS {node.counts.ops}</span>

  </div>

</li>




```
    - Ensure long labels **truncate**; counters never wrap. Keep tree ARIA roles (`role="tree"`, `role="treeitem"`, `aria-expanded` on expandable rows).
3. **Rename Activities → ACX**
    - In any left-rail headers/columns/tooltips within `OmniBrowser.tsx`, replace visible “Activities” with **“ACX”**.
    - For screen readers, you may keep clarity using `aria-label="ACX (activities)"` on the header once.
4. **Copy JSON icon-only (Scenario tab)**
    - In `ScenarioTab.tsx`, convert the Copy button to **icon-only**:```javascript
<button
  aria-label="Copy manifest JSON"
  title="Copy JSON"
  className="icon-btn"
  onClick={copyJson}
>
  <CopyIcon aria-hidden />
</button>
```

- - Remove any adjacent text label.

1. **Tighten density tokens**

- - In `tokens.ts`, expose a utility class or boolean for **tabular numbers** and small gaps:```javascript

export const typography = { numeric: 'tabular-nums' };

export const density = { padX: 8, padY: 6, gap: 6 }; // matches 087




```
    - Apply `tabular-nums` class (Tailwind feature variant or CSS `font-variant-numeric: tabular-nums;`) to the counter container as shown.

**Acceptance tests (Vitest + RTL + jest-axe):**

- **One-line row @ 1024px:** each sector item renders on **one line** (no wrapping).
    - Assert `.truncate` applies; measure row height ≤ **36 px** using `getComputedStyle` or snapshot of class list.
- **Status chip a11y:** `role="img"` + `aria-label` announces “Rendered”/“Missing data”.
- **Counts readable:** screen reader reads “ACX 24”, “OPS 12”; numeric text uses tabular figures (snapshot class).
- **Copy JSON icon-only:** find by role with `name=/copy manifest json/i`; ensure there is **no adjacent visible text**; clicking copies to clipboard (mock `navigator.clipboard.writeText`).
- **Virtualization preserved:** with 5 k nodes, DOM only contains visible rows (assert count < 150 for viewport).
- **No regressions:** tree keyboard controls (↑/↓/←/→/Enter) still work; axe **0 serious** violations.

**Performance budgets:**

- Rendering 50 rows: ≤ **10 ms** commit time; scroll FPS ≥ **55**.
- No new deps; code delta < **3 KB** gz.
- No additional layout shift on row hover/selection.

**CI notes:**

- Tests under `site/src/components/OmniBrowser/__tests__/rows.compaction.test.tsx` and `ContextRail/__tests__/scenario.copyjson.test.tsx`.
- Include an E2E (Cypress/Playwright) viewport-1024 check that list rows stay single-line and counters don’t wrap.
- Lint checks pass; forbid `node:*` imports; snapshots updated.

***

Deprecated:

***

## ACX‑CDX‑082 — Omni Browser (Virtualized Tree + Search)

**Intent:** Discover all Layers/Activities/Figures from left rail; fast filter; kb nav.

**Paths:** `site/src/components/OmniBrowser.tsx`, `site/src/theme/tokens.ts`, `site/src/**/__tests__/OmniBrowser.test.tsx`.

**Do:**

1) Virtualized list/tree; arrow‑key nav; Enter opens; Shift+Enter focus in center.

2) Scoped search (Entities/Layers/Activities/Figures/Scenarios/Refs).

3) Show deterministic index [n]; badges for refs count; lazy children load.

**Tests:**

- RTL: filter + keyboard traversal; open/focus actions.
- Axe: names/roles on tree items; aria‑selected updates.
- Perf: list virtualization proven at 5k items.

***

## ACX‑CDX‑083 — Context Rail Tabs

**Intent:** Right rail tabs (References ▸ Scenario ▸ Compare ▸ Chat ▸ Logs) with URL binding.

**Paths:** `site/src/components/ContextRail.tsx`, `site/src/hooks/useDeepLink.ts`.

**Do:**

1) Implement tabs; each loads lazily; preserve scroll per tab.

2) Bind active tab + params to URL (`view=refs|scenario|compare|chat|logs`).

3) References shows manifest hash and refs list (deterministic order).

**Tests:**

- RTL: tab switching preserves scroll; URL reflects state.
- Axe: tab roles, aria‑controls, roving tabindex.

***

## ACX‑CDX‑084 — Visualizer Surface + Focus Mode

**Intent:** Primary canvas with Focus Mode and secondary dock.

**Paths:** `site/src/components/VisualizerSurface.tsx`, `site/src/theme/tokens.ts`.

**Do:**

1) Plot host wrapper; “dense” Plotly theme (tight margins, compact legends).

2) Focus Mode: max screen, auto‑tighten margins; Esc to exit.

3) Secondary dock toggle (right/left/bottom); persists in layout store.

**Tests:**

- RTL: focus toggle; dock placement persistence.
- Perf: interaction latency <200ms (synthetic test).

***

## ACX‑CDX‑085 — Command Palette + Deep Links

**Intent:** ⌘K palette for open/focus/navigate; deep links for all pane state.

**Paths:** `site/src/components/CommandPalette.tsx`, `site/src/hooks/useDeepLink.ts`.

**Do:**

1) Palette with actions: open layer/activity/figure, focus viz, toggle rails.

2) `useDeepLink`: serialize pane state to URL; SSR‑safe parsing.

3) From `/`, reach any entity in ≤2 actions (filter → open).

**Tests:**

- RTL: palette opens; actions mutate panes & URL.
- Perf: palette lazy‑loads under 30KB gz.

***

## ACX‑CDX‑086 — A11y, Perf & CI Hardening

**Intent:** Close acceptance gaps; enforce budgets in CI.

**Paths:** `site/.github/workflows/ci.yml`, `site/src/**`, `site/scripts/perf-check.mjs`.

**Do:**

1) Add skip links; landmarks; keyboard pane resize; reduced‑motion.

2) Add axe smoke suite; perf-check script (bundlesize, LCP/CLS via lab run).

3) Pin Node/pnpm; strict TS/ESLint; forbid `node:*` in client via lint rule.

**Tests:**

- Axe: zero critical violations; keyboard traversal across panes.
- Perf: LCP ≤2.5s, CLS <0.1 on app route in CI.
```
