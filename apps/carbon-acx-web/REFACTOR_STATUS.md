# Carbon ACX Architecture Refactor - Sprint Status

**Date:** 2025-10-26
**Branch:** rebuild/canvas-story-engine
**Status:** Partial completion - framework established, requires completion

## Completed Work

### Phase 1: XState Removal ✅
- **Deleted Files:**
  - `src/machines/journeyMachine.ts`
  - `src/hooks/useJourneyMachine.ts`
- **Dependencies Removed:**
  - `xstate` (5.23.0)
  - `@xstate/react` (6.0.0)

### Phase 2: Layout Simplification ✅
- **Created:** `src/styles/canvas.css`
  - `.canvas-hero` (70vh, grid layout)
  - `.canvas-insight` (20vh, subtle background)
  - `.canvas-detail` (10vh, elevated surface)
  - Responsive adjustments for mobile
  - Padding variants (compact, expanded)

### Phase 3: New App Structure ✅
- **Created:** `src/CanvasApp.tsx` (new simplified version)
  - React Router-based navigation (BrowserRouter)
  - Smart redirect: data exists → /explore, empty → /welcome
  - Lazy-loaded pages with Suspense
  - Removed XState journey machine
  - Debug panel for development

- **Created:** `src/pages/WelcomePage.tsx`
  - Extracted from OnboardingScene
  - Uses `useNavigate` instead of XState events
  - Preserves 3-step onboarding flow
  - Navigates to `/calculator` with mode state

- **Backed Up:** `src/CanvasApp.old.tsx` (original for reference)

### Phase 4: Page Migration (Partial) ⏸️
- **Copied but not updated:**
  - `src/pages/CalculatorPage.tsx` (from BaselineScene.tsx)
  - `src/pages/ExplorePage.tsx` (from ExploreScene.tsx)
  - `src/pages/InsightsPage.tsx` (from InsightScene.tsx)

## Remaining Work

### Critical Issues (Must Fix)

#### 1. Page Component Updates
All pages in `src/pages/` need:
- Change named exports to `export default`
- Update import paths (remove one `../` level)
- Replace `useJourneyMachine` with `useNavigate`
- Remove `CanvasZone` / `StoryScene` wrappers
- Replace with simple `<div className="canvas-hero">` etc.

**Example Fix for CalculatorPage.tsx:**
```tsx
// Before
export function BaselineScene({ show, mode, onComplete }: BaselineSceneProps) {
  // ...
  return (
    <StoryScene>
      <CanvasZone zone="hero">
        {/* content */}
      </CanvasZone>
    </StoryScene>
  );
}

// After
export default function CalculatorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode || 'calculator';

  return (
    <div className="canvas-hero">
      {/* content */}
      <button onClick={() => navigate('/explore')}>Continue</button>
    </div>
  );
}
```

#### 2. Import Path Fixes
All page files have broken imports due to directory change:
```tsx
// Old (scenes in components/scenes/)
import { Button } from '../system/Button';
import { useAppStore } from '../../hooks/useAppStore';

// New (pages in pages/)
import { Button } from '../components/system/Button';
import { useAppStore } from '../hooks/useAppStore';
```

#### 3. Remove useJourneyMachine References
Files still referencing deleted hook:
- `src/pages/ExplorePage.tsx` - Line 26
- `src/pages/InsightsPage.tsx` - Line 29
- `src/examples/CanvasExample.tsx`
- `src/examples/JourneyExample.tsx`

Replace with React Router navigation:
```tsx
// Before
const { viewInsights } = useJourneyMachine();
<button onClick={viewInsights}>View Insights</button>

// After
const navigate = useNavigate();
<button onClick={() => navigate('/insights')}>View Insights</button>
```

### Phase 5: Component Flattening (Not Started)
**Goal:** Merge viz/ and domain/ into components/

1. Move `src/components/viz/*` → `src/components/`
2. Move `src/components/domain/*` → `src/components/`
3. Update all imports across codebase

### Phase 6: Store Simplification (Not Started)
**File:** `src/store/appStore.ts`

Remove UI state that's no longer needed:
```tsx
// Remove these
activeZone: CanvasZone;
transitionState: TransitionState;
setActiveZone: (zone: CanvasZone) => void;
setTransitionState: (state: TransitionState) => void;

// Update partialize
partialize: (state) => ({
  profile: state.profile,  // Only persist profile data
})
```

### Phase 7: ProfileContext Migration (Not Started)
**Goal:** Delete `src/contexts/ProfileContext.tsx`

The Zustand store already has all the functionality. Find and remove any remaining `useProfile()` calls.

### Phase 8: Zod Validation (Not Started)
**Install:**
```bash
pnpm add zod
```

**Create:** `src/store/schema.ts`
```tsx
import { z } from 'zod';

export const ActivitySchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  // ... rest of schema
});

export const ProfileDataSchema = z.object({
  activities: z.array(ActivitySchema),
  calculatorResults: z.array(CalculatorResultSchema),
  // ...
});
```

**Update:** `src/store/appStore.ts` persist middleware
```tsx
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'carbon-acx-storage',
    partialize: (state) => ({ profile: state.profile }),
    onRehydrateStorage: () => (state) => {
      if (state) {
        try {
          ProfileDataSchema.parse(state.profile);
        } catch (error) {
          console.error('Invalid persisted data, resetting:', error);
          state.profile = initialProfile;
        }
      }
    },
  }
)
```

### Phase 9: Cleanup (Not Started)
1. Delete old scene components: `src/components/scenes/*`
2. Delete `src/components/canvas/CanvasZone.tsx`
3. Delete `src/components/canvas/StoryScene.tsx` (if unused)
4. Delete `src/CanvasApp.old.tsx` (backup)
5. Delete `src/contexts/ProfileContext.tsx`
6. Update `src/hooks/useAppStore.ts` type exports

## TypeScript Errors Summary

**Count:** 60+ errors
**Primary Causes:**
1. Missing `default` exports in page components (3 errors)
2. Wrong import paths after file moves (40+ errors)
3. Missing `useJourneyMachine` hook (6 errors)
4. `any` type inference from removed types (10+ errors)

## Testing Strategy

1. **Fix TypeScript errors:**
   ```bash
   pnpm exec tsc --noEmit
   ```

2. **Run dev server:**
   ```bash
   pnpm dev
   ```

3. **Test routes:**
   - `/` → Should redirect based on data
   - `/welcome` → Onboarding flow
   - `/calculator` → Baseline establishment
   - `/explore` → Emissions visualization
   - `/insights` → Insights and goals

4. **Test state persistence:**
   - Add activities, refresh page
   - Should maintain state via Zustand persist

5. **Test navigation:**
   - Complete onboarding → Calculator
   - Complete calculator → Explore
   - Explore → Insights

## Priority Next Steps

1. **Fix CalculatorPage.tsx** (highest priority - blocks calculator flow)
2. **Fix ExplorePage.tsx** (second priority - main app view)
3. **Fix InsightsPage.tsx** (third priority - secondary feature)
4. **Run TypeScript** to verify no errors
5. **Test in browser** with `pnpm dev`
6. **Remove old scenes** directory
7. **Simplify store** (remove UI state)
8. **Add Zod validation**

## Files to Review

**Modified:**
- `src/CanvasApp.tsx` ✅
- `package.json` (dependencies removed) ✅

**Created:**
- `src/styles/canvas.css` ✅
- `src/pages/WelcomePage.tsx` ✅
- `src/pages/CalculatorPage.tsx` ⚠️ (needs default export + imports fixed)
- `src/pages/ExplorePage.tsx` ⚠️ (needs default export + imports fixed)
- `src/pages/InsightsPage.tsx` ⚠️ (needs default export + imports fixed)

**Deleted:**
- `src/machines/journeyMachine.ts` ✅
- `src/hooks/useJourneyMachine.ts` ✅

**To Delete:**
- `src/components/scenes/` (after pages are working)
- `src/CanvasApp.old.tsx` (after verification)
- `src/contexts/ProfileContext.tsx` (after Zustand migration complete)
- `src/components/canvas/CanvasZone.tsx` (after replacement complete)

## Architecture Changes

### Before:
```
XState Journey Machine
  ↓
Scene Visibility State
  ↓
CanvasZone Components
  ↓
StoryScene Wrapper
  ↓
Complex State Orchestration
```

### After:
```
React Router
  ↓
Pages (default exports)
  ↓
Simple CSS Classes (.canvas-hero, etc.)
  ↓
Zustand for App State Only
```

## Design Decisions

1. **React Router over XState:** Standard pattern, easier to understand
2. **CSS classes over CanvasZone:** Less abstraction, better performance
3. **Default exports for pages:** React.lazy requirement
4. **Preserved TransitionWrapper:** Animation value worth the complexity
5. **Kept Zustand:** Well-implemented, just needs simplification

## Risks & Considerations

1. **Incomplete Migration:** Pages need updates before app works
2. **Breaking Changes:** Old examples/ may break (acceptable - not production)
3. **Test Coverage:** No tests exist for refactored code
4. **Visual Regressions:** Layout may differ slightly with CSS classes

## Success Criteria

- [ ] App loads without TypeScript errors
- [ ] All routes navigate correctly
- [ ] State persists across refreshes
- [ ] Visualizations render (ECharts, etc.)
- [ ] Calculator flow completes
- [ ] Build succeeds (`pnpm build`)

## Estimated Completion Time

- **Critical fixes (pages):** 2-3 hours
- **Store simplification:** 1 hour
- **Zod validation:** 1-2 hours
- **Cleanup & testing:** 1-2 hours
- **Total:** 5-8 hours

## Commands Reference

```bash
# Check TypeScript errors
pnpm exec tsc --noEmit

# Run dev server
pnpm dev

# Build for production
pnpm build

# Run tests (when available)
pnpm test

# Check for useJourneyMachine references
grep -r "useJourneyMachine" src/

# Check for CanvasZone references
grep -r "CanvasZone" src/
```

## Documentation Updates Needed

After completion:
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Update `docs/acx/ACX080.md` (Phase 1 rebuild doc)
- [ ] Create `docs/acx/ACX[NEXT].md` documenting refactor
- [ ] Update README.md development guide
