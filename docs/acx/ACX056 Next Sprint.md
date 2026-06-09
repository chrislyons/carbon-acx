---
source: standard-notes
sn_filename: "ACX056 Next Sprint-ae1967f6.txt"
prefix: acx
original_format: lexical
imported: 2026-05-01
status: archive
related:
  - ACX
---

# ACX-CDX-091 — Generate semantic model from backend (schema → JSON)

**Intent**
Infer the app’s ontology directly from the backend. Produce a compact, versioned JSON “semantic model” Codex can use to build UI (entities, fields, relations, sample queries).

**Do**

1. **Create** `apps/carbon-acx-web/schema/semantic-model.ts`:
2. - If GraphQL: introspect via HTTP endpoint and synthesize an object model.
- If Prisma: `pnpm exec prisma introspect` fallback; parse `schema.prisma`.
- Normalize to:
```





```
- Include helpers: `findEntity(name)`, `primaryKeyOf(entity)`.
3. **Create** `apps/carbon-acx-web/schema/sample-queries.ts` with typed fetchers for:
4. - `listSectors()`, `getSector(id)`, `listActivities(sectorId)`,
- `getDataset(id)`, `listReferences(datasetId)`.
5. **Wire** a script:
6. - `package.json` (repo root):
```


```

**Acceptance**

- `pnpm schema:gen` succeeds and writes a stable `model` export.
- Entities include at least: `Sector`, `Activity`, `Profile`, `Dataset`, `Reference`, `Manifest`.
- CI artifact includes `semantic-model.ts` output preview.


---


# ACX-CDX-092 — Information Architecture (IA) + routes from the model

**Intent**
Translate the semantic model into a clean navigation & routing plan. No legacy metaphors — just Sector → Scope → Dataset → Visualization → References.

**Do**

1. **Create** `apps/carbon-acx-web/src/ia/ia-spec.ts`:
```














```
2. **Scaffold routes/layout** (React + Vite):
3. - `src/App.tsx`, `src/router.tsx` (react-router v6), route loaders using `sample-queries`.
- `src/views/Layout.tsx` with 3-pane responsive grid (nav / main / inspect).
4. **Create** first-pass views:
5. - `src/views/NavSidebar.tsx` (lists sectors; search).
- `src/views/ScopeSelector.tsx` (sector/profile chips).
- `src/views/VisualizationCanvas.tsx` (empty state + slot).
- `src/views/ReferencePanel.tsx` (sticky list with citations).
6. **Add** basic error boundaries + skeleton loaders (shadcn/ui `Skeleton`).

**Acceptance**

- `pnpm dev` serves routes with working loaders.
- Resize to mobile: panes collapse to a single column with a bottom sheet for references.
- Lighthouse a11y ≥ 90 on scaffold pages.


---


# ACX-CDX-093 — Design system + data hooks + first visualizations

**Intent**
Install a cohesive visual language, data hooks, and a production-grade chart primitive (no vendor lock-in).

**Do**

1. **Theme & tokens**
2. - `src/lib/theme.ts`: color scales, spacing, radius, shadows, motion.
- `src/styles/tokens.css`: CSS variables (light/dark); prefers-reduced-motion.
- Tailwind config update: map tokens to utilities.
3. **Install shadcn/ui + Radix + framer-motion + swr**
4. - Build `Button, Card, Tabs, Sheet, ScrollArea, Tooltip, Dialog`.
- `src/hooks/useDataset.ts` (SWR): `useSectors`, `useActivities`, `useDataset`, `useReferences`.
5. **Charts**
6. - `src/components/charts/BubbleFigure.tsx` (recharts): accessible labels, 60fps idle.
- `src/views/VisualizationCanvas.tsx`: render BubbleFigure from dataset response; empty / error states.
7. **Keyboard & a11y**
8. - Focus rings, roving tab index in Nav, `aria-live` for loader transitions.

**Acceptance**

- Visual refresh matches tokens (max 4 accents).
- Dataset view renders a bubble chart within 2s on desktop; no layout shift > 0.1 CLS.
- a11y: all interactive elements keyboard reachable; color contrast AA.


---


# ACX-CDX-094 — Replace legacy UI; migration flag; perf & QA

**Intent**
Cut over from the old interface with a guarded toggle; harden perf; document.

**Do**

1. **Feature flag**
2. - `ACX_NEW_UI=1` env; in `src/main.tsx` choose `NewApp` vs `LegacyApp`.
3. **Perf**
4. - Code-split routes; `React.lazy` + `Suspense`.
- Memoize heavy charts; virtualize long lists in references.
- Add `vite-plugin-compression` and set long-term headers in `/public/_headers`.
5. **QA**
6. - Playwright smoke: load → select sector → load dataset → chart renders → references listed.
- Vitest for hooks (SWR cache, error paths).
7. **Docs**
8. - `docs/UX-IA.md` (rationale + screenshots).
- `docs/THEMING.md` (tokens & usage).
- `README` badge for “New UI Preview”.

**Acceptance**

- With `ACX_NEW_UI=1`, legacy components are not loaded.
- First Byte to Interactive ≤ 2s on desktop; route transitions ≤ 300ms.
- Playwright passes in CI; screenshots uploaded as artifacts.


---


## Kickoff commands (once merged)


```






```

If you want, I can add a **“one-click Codex Cloud meta-prompt”** that strings 091→094 into separate PRs with branch names, commit scopes, and CI triggers.
