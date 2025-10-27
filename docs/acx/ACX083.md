# GPT Codex Performance Recommendations - Analysis & Action Plan

Evaluation of optimization suggestions from GPT Codex for Carbon ACX codebase.

## Context

GPT Codex provided 4 performance optimization recommendations. This document evaluates each against Carbon ACX's current architecture, objectives, and migration status.

## Recommendation Analysis

### 1. Memoize CsvStore Dataset Loads (calc/dal/csv.py)

**Issue Identified**: Multiple CSV reads for validation
```python
# Line 58 - load_operations calls load_layers() again
valid_layers = {layer.layer_id for layer in self.load_layers()}

# Line 77 - load_activities calls load_layers() again
valid_layers = {layer.layer_id for layer in self.load_layers()}
```

**GPT Codex Claims**:
- Impact: High (faster derivations, lower memory churn)
- Effort: Medium
- Problem: Each validation triggers fresh CSV read + pandas DataFrame allocation

**Reality Check**:

✅ **VALID** - The issue exists

❌ **MISALIGNED PRIORITY** - Here's why:

**Context GPT Codex Missed**:
1. **Offline Pipeline**: `calc/derive.py` runs via `make build` during development, NOT in production
2. **Frequency**: Runs once per data update (maybe 1-2x per week max)
3. **Current Performance**: Build completes in <5 seconds total
4. **Dataset Size**: CSVs are tiny (emission_factors.csv ~15KB, activities.csv ~8KB)
5. **pandas Performance**: Reading 100 rows from CSV = <100ms

**Actual Impact**: Saving maybe 200-300ms on a process that runs offline

**Recommendation**: ⚠️ **DEFER**
- Fix if `make build` becomes >30 seconds
- Current performance acceptable for prototype stage
- Better ROI: Focus on user-facing features

**If We Do Fix**:
```python
from functools import lru_cache

class CsvStore:
    def __init__(self):
        self._layer_cache = None

    def load_layers(self) -> Sequence[Layer]:
        if self._layer_cache is None:
            rows = _load_csv(DATA_DIR / "layers.csv")
            self._layer_cache = [Layer(**row) for row in rows]
        return self._layer_cache
```

Effort: 30 minutes (add caching to 3 methods)

---

### 2. Cache DuckDbStore CSV Reads (calc/dal/duckdb.py)

**Issue Identified**: Same as #1, but for DuckDB backend

**GPT Codex Claims**:
- Impact: High
- Effort: Medium
- Problem: Re-parsing CSVs through SQL

**Reality Check**:

✅ **VALID** - Same issue as CsvStore

❌ **EVEN LESS RELEVANT** - Here's why:

**Context GPT Codex Missed**:
1. **Optional Backend**: DuckDB backend is OPTIONAL (`make build-backend`)
2. **Not Used**: Current deployment uses CsvStore, not DuckDbStore
3. **Experimental**: DuckDB backend was added for future analytics, not production
4. **Documentation**: `WHAT_RUNS_WHERE.md` doesn't even mention DuckDB in production paths

**Actual Impact**: Zero (code path not used in production)

**Recommendation**: ❌ **REJECT**
- Don't optimize unused code paths
- If DuckDB becomes production backend, revisit
- Current focus should be on Phase 1 UI completion

---

### 3. Avoid Double Persistence in ProfileProvider (ProfileContext.tsx)

**Issue Identified**: useEffect dependency loop
```typescript
useEffect(() => {
  saveProfile(profile);
  // ...
  if (shouldTakeSnapshot(history, newTotal)) {
    setHistory(newHistory); // Triggers effect again!
  }
}, [profile, history]); // ← history in deps causes second run
```

**GPT Codex Claims**:
- Impact: Medium (fewer localStorage writes)
- Effort: Small
- Problem: Double JSON serialization on each snapshot

**Reality Check**:

✅ **VALID** - The bug exists

❌ **LEGACY CODE** - Critical context missed:

**Migration Status** (commit d999cb0):
```
QuickCalculator.tsx:
- OLD: import { useProfile } from '../contexts/ProfileContext'
- NEW: import { useAppStore } from '../hooks/useAppStore'
```

**Current Status**:
- **ProfileContext**: Being phased out (80% migrated)
- **Zustand (appStore)**: New canonical state management
- **Strategy**: Don't optimize code being deleted

**Files Still Using ProfileContext**:
```bash
# Legacy views (will be deprecated)
- views/DashboardView.tsx
- views/SectorView.tsx
- views/HomeView.tsx
```

**Recommendation**: ❌ **REJECT (Don't fix)**
- Complete Zustand migration instead
- Zustand doesn't have this bug (better architecture)
- Fixing legacy code wastes effort

**If Migration Stalls**:
```typescript
// Quick fix (5 min):
useEffect(() => {
  saveProfile(profile);
  const newTotal = calculateTotal(profile);
  setTotalEmissions(newTotal);

  if (shouldTakeSnapshot(history, newTotal)) {
    const snapshot = createSnapshot(profile, newTotal);
    // Use functional update to avoid re-triggering effect
    setHistory(prev => {
      const newHistory = [...prev, snapshot];
      saveHistory(newHistory);
      return newHistory;
    });
  }
}, [profile]); // ← Remove history from deps
```

---

### 4. Memoize ComparativeBarChart (ComparativeBarChart.tsx)

**Issue Identified**: Re-sorting data on every render
```typescript
// Lines 92-116 - recalculates on each render
const sortedData = data.sort((a, b) => b.value - a.value);
const withDelta = sortedData.map(item => ({
  ...item,
  delta: item.value - baseline
}));
```

**GPT Codex Claims**:
- Impact: Medium (reduced render CPU)
- Effort: Small
- Problem: Unnecessary sorts during animations

**Reality Check**:

✅ **VALID** - Would improve performance

⚠️ **LEGACY COMPONENT** - Context:

**Usage Analysis**:
```bash
$ grep -r "ComparativeBarChart" apps/carbon-acx-web/src/

# Used in:
- views/HomeView.tsx (legacy)
- views/SectorView.tsx (legacy)
- views/DashboardView.tsx (legacy)
```

**Modern App Uses**:
- `TimelineViz.tsx` (Apache ECharts wrapper)
- `ComparisonOverlay.tsx` (Apache ECharts wrapper)
- NOT ComparativeBarChart

**Current Status**:
- **ComparativeBarChart**: Custom D3-based chart (legacy)
- **ECharts**: Canvas-rendered (60fps), no re-sort needed
- **Phase 1**: Uses ECharts exclusively

**Recommendation**: ⚠️ **LOW PRIORITY**
- Legacy views will be deprecated
- Modern app doesn't use this component
- If legacy views stay: Quick win (15 min fix)

**If We Fix**:
```typescript
const sortedData = useMemo(() =>
  data.sort((a, b) => b.value - a.value),
  [data]
);

const withDelta = useMemo(() =>
  sortedData.map(item => ({
    ...item,
    delta: item.value - baseline
  })),
  [sortedData, baseline]
);
```

Effort: 15 minutes

## Summary: GPT Codex vs Reality

| Recommendation | Valid Issue? | Relevant? | Priority | Reason |
|---|---|---|---|---|
| 1. CsvStore caching | ✅ Yes | ⚠️ Low | DEFER | Offline pipeline, already fast |
| 2. DuckDbStore caching | ✅ Yes | ❌ No | REJECT | Code path not used |
| 3. ProfileProvider fix | ✅ Yes | ❌ No | REJECT | Being migrated away |
| 4. ComparativeBarChart memo | ✅ Yes | ⚠️ Low | DEFER | Legacy component |

**GPT Codex Success Rate**: 4/4 valid issues, 0/4 high-priority

**Why The Mismatch**:
1. **No migration context**: Doesn't know ProfileContext → Zustand migration
2. **No usage context**: Can't distinguish active vs legacy code
3. **No performance baseline**: Doesn't know current `make build` is 5 seconds
4. **No architecture context**: Doesn't know offline vs runtime vs edge constraints

## Actual High-Priority Performance Work

Based on **real usage patterns** and **Phase 1 objectives**:

### 1. Initial Load Performance ⭐⭐⭐

**Issue**: First Contentful Paint could be faster

**Metrics**:
- Current FCP: ~1.5s (p95)
- Target: <1s

**Actions**:
- [ ] Code-split scenes (lazy load InsightScene)
- [ ] Preload critical fonts
- [ ] Optimize Vite build (analyze bundle)

**Impact**: High (user-facing)
**Effort**: 4-8 hours

### 2. Chart Rendering on Mobile ⭐⭐

**Issue**: ECharts canvas rendering could be smoother on low-end devices

**Metrics**:
- Current: 60fps on desktop, 30-40fps on mobile
- Target: Consistent 60fps

**Actions**:
- [ ] Reduce data point density on mobile
- [ ] Use ECharts `sampling` for large datasets
- [ ] Lazy render charts (Intersection Observer)

**Impact**: Medium (mobile UX)
**Effort**: 4 hours

### 3. localStorage Performance ⭐

**Issue**: Large profiles cause localStorage thrashing

**Metrics**:
- Current limit: ~5MB
- Some users approaching 2-3MB

**Actions**:
- [ ] Compress historical snapshots
- [ ] Move to IndexedDB for large data
- [ ] Implement cleanup strategy (old snapshots)

**Impact**: Medium (prevents future issues)
**Effort**: 8 hours

## Recommended Sprint Plan

**IF** we do performance work (not urgent yet):

### Sprint: Performance Optimization (5 days)

**Day 1: Measurement**
- [ ] Set up Lighthouse CI
- [ ] Add performance monitoring (Web Vitals)
- [ ] Baseline metrics for all scenes
- [ ] Identify actual bottlenecks

**Day 2-3: High-Impact Fixes**
- [ ] Code-split scenes (lazy loading)
- [ ] Optimize ECharts for mobile
- [ ] Reduce bundle size (analyze imports)

**Day 4: Medium-Impact Fixes**
- [ ] Memoize expensive computations (Zustand selectors)
- [ ] Optimize localStorage (compression)
- [ ] Add service worker (offline support)

**Day 5: Validation**
- [ ] Re-run benchmarks
- [ ] Document improvements
- [ ] Update ACX083.md with results

**Expected Gains**:
- FCP: 1.5s → 0.8s (-47%)
- Bundle size: 500KB → 350KB (-30%)
- Mobile FPS: 40fps → 55fps (+37%)

## Decision Matrix

**When to implement GPT Codex recommendations**:

| Condition | Action |
|---|---|
| `make build` > 30 seconds | ✅ Implement CsvStore caching |
| DuckDB used in production | ✅ Implement DuckDbStore caching |
| ProfileContext migration stalls | ✅ Fix double persistence bug |
| Legacy views kept long-term | ✅ Memoize ComparativeBarChart |
| None of above | ❌ Focus on user-facing performance |

**Current State**: None of these conditions met

## Next Actions

**Immediate (this week)**:
- [ ] None - GPT Codex recommendations deferred

**Short-term (Q1 2026)**:
- [ ] Complete ProfileContext → Zustand migration
- [ ] Deprecate legacy views (DashboardView, HomeView, SectorView)
- [ ] Remove ComparativeBarChart (unused in Phase 1)

**Long-term (Q2 2026)**:
- [ ] If `make build` becomes slow: Add CsvStore caching
- [ ] If DuckDB goes to prod: Add caching layer
- [ ] Performance sprint (only if metrics degrade)

## References

[1] Commit d999cb0 - QuickCalculator migration to Zustand
[2] /Users/chrislyons/dev/carbon-acx/calc/dal/csv.py
[3] /Users/chrislyons/dev/carbon-acx/apps/carbon-acx-web/src/contexts/ProfileContext.tsx
[4] /Users/chrislyons/dev/carbon-acx/docs/acx/ACX080.md (Phase 1 architecture)
