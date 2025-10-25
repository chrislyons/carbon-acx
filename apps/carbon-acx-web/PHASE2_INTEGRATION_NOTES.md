# Phase 2 Integration Notes

**Date:** 2025-10-25
**Status:** Requires Interface Alignment
**Phase:** Post-Phase 2, Pre-Phase 3

## Summary

Phase 2 (Weeks 4-6) components were created with assumed APIs based on the Phase 1 component interfaces documented in ACX080.md. However, TypeScript compilation reveals interface mismatches that need resolution before the application can build successfully.

This document catalogs all interface mismatches for systematic resolution in a future integration pass.

---

## TypeScript Errors by Component

### 1. Button Component Interface Mismatch

**Issue:** Phase 2 components use `icon` prop, but Phase 1 Button doesn't support it

**Affected Components:**
- `BaselineScene.tsx` (lines 269, 535)
- `ExploreScene.tsx` (lines 249, 257)
- `InsightScene.tsx` (lines 222, 230, 257, 298, 333)
- `OnboardingScene.tsx` (lines 254, 536)

**Expected API (Phase 2 usage):**
```typescript
<Button icon={<Icon className="w-5 h-5" />}>Text</Button>
```

**Actual API (Phase 1 implementation):**
```typescript
// Button.tsx doesn't have `icon` prop in current interface
```

**Resolution Required:**
- Update `Button.tsx` to support optional `icon` prop
- Add left/right icon positioning support
- Update ButtonProps interface

---

### 2. TransitionWrapper Type Mismatch

**Issue:** Phase 2 uses `type="zoom"` which doesn't exist in Phase 1

**Affected Components:**
- `BaselineScene.tsx` (line 313)

**Expected API:**
```typescript
type TransitionType = 'fade' | 'slide-up' | 'slide-down' | 'zoom' | 'story' | ...
```

**Actual API:**
```typescript
// TransitionWrapper doesn't support 'zoom' type
```

**Resolution Required:**
- Add 'zoom' transition type to TransitionWrapper
- Implement zoom animation using Framer Motion scale transform

---

### 3. StoryScene Missing Required Props

**Issue:** Phase 2 components don't provide `title` prop required by StoryScene

**Affected Components:**
- `ExploreScene.tsx` (line 207)
- `InsightScene.tsx` (line 117)

**Current Usage:**
```typescript
<StoryScene scene="explore" layout="canvas">
```

**Required API:**
```typescript
<StoryScene scene="explore" layout="canvas" title="Explore">
```

**Resolution Required:**
- Either make `title` optional in StoryScene
- Or add title props to all scene usages

---

### 4. CanvasZone Missing Required `zoneId` Prop

**Issue:** Phase 2 components use `zone` instead of `zoneId`

**Affected Components:**
- `ExploreScene.tsx` (lines 208, 306, 366)
- `InsightScene.tsx` (lines 118, 416)
- `OnboardingScene.tsx` (line 137)

**Current Usage:**
```typescript
<CanvasZone zone="hero" padding="lg">
```

**Required API:**
```typescript
<CanvasZone zoneId="hero" padding="lg">
```

**Resolution Required:**
- Rename `zone` prop to `zoneId` in all Phase 2 scenes
- Or update CanvasZone to accept `zone` alias

---

### 5. TimelineViz Data Structure Mismatch

**Issue:** TimelineDataPoint requires `timestamp` field

**Affected Components:**
- `ExploreScene.tsx` (lines 270, 271)

**Current Usage:**
```typescript
const dataPoints = [
  { date: '2024-01-01', value: 1000, breakdown: {...} }
];
```

**Required API:**
```typescript
interface TimelineDataPoint {
  timestamp: string; // ISO date
  value: number;
  breakdown?: Record<string, number>;
}
```

**Resolution Required:**
- Rename `date` to `timestamp` in ExploreScene data generation
- Update milestone structure similarly

---

### 6. ComparisonOverlay Prop Names

**Issue:** Phase 2 uses `leftChart`/`rightChart`, actual API uses different names

**Affected Components:**
- `ExploreScene.tsx` (line 283)

**Current Usage:**
```typescript
<ComparisonOverlay
  leftChart={leftOption}
  rightChart={rightOption}
  height="500px"
/>
```

**Required API (needs verification):**
```typescript
// Check ComparisonOverlay.tsx for actual prop names
```

**Resolution Required:**
- Align prop names between usage and implementation

---

### 7. Storybook React Import Missing

**Issue:** Storybook type declarations not found

**Affected Components:**
- `Button.stories.tsx` (line 7)

**Current Error:**
```
Cannot find module '@storybook/react'
```

**Resolution Required:**
- Verify Storybook is properly installed
- Check if `@storybook/react` is in devDependencies
- May need `pnpm install` to sync lockfile

---

### 8. ComparisonOverlay ECharts Type Error

**Issue:** Attempting to pass EChartsType array as string

**Affected Components:**
- `ComparisonOverlay.tsx` (line 129)

**Error:**
```
Argument of type 'EChartsType[]' is not assignable to parameter of type 'string'
```

**Resolution Required:**
- Review ECharts connection logic
- Fix type mismatch in chart synchronization code

---

### 9. Legacy Scene Files in `/src/scenes/`

**Issue:** Old scene files exist outside component structure

**Affected Files:**
- `src/scenes/BaselineScene.tsx`
- `src/scenes/OnboardingScene.tsx`

**Errors:**
- Unknown `layer` property on Activity type
- Missing `emissionFactor` property
- Incorrect `showProgress` prop name (should be `progress`)

**Resolution Required:**
- Delete legacy scene files (replaced by Phase 2 versions in `src/components/scenes/`)
- Or migrate any unique functionality from legacy to new versions

---

### 10. OnboardingScene Progress Prop Type

**Issue:** Passing object where number expected

**Affected Components:**
- `OnboardingScene.tsx` (line 136)

**Current Usage:**
```typescript
progress={{ current: step, total: 3 }}
```

**Expected API:**
```typescript
progress={number} // 0-1 or 0-100
```

**Resolution Required:**
- Change progress prop to simple number calculation: `progress={step / 3}`
- Or update StoryScene to accept progress object

---

### 11. Lucide Icon Style Prop

**Issue:** Passing `style` prop to Lucide icon components

**Affected Components:**
- `OnboardingScene.tsx` (line 368)

**Current Usage:**
```typescript
<Icon className="..." style={{ color: '...' }} />
```

**Expected API:**
```typescript
<Icon className="..." /> // Use className for color
```

**Resolution Required:**
- Remove `style` prop from icon components
- Use className or CSS variables instead

---

## Integration Strategy

### Option A: Fix-All-At-Once (Recommended for Production)
1. Create integration branch from `rebuild/canvas-story-engine`
2. Systematically resolve all interface mismatches
3. Run `pnpm build` after each fix
4. Commit when build succeeds
5. Merge back to rebuild branch

### Option B: Incremental Component Integration
1. Fix one component at a time
2. Comment out broken components temporarily
3. Gradually uncomment as fixes are applied
4. Suitable for parallel development

### Option C: API Documentation First
1. Document actual Phase 1 component APIs
2. Update Phase 2 components to match
3. Create migration guide for future components
4. Establish component contract testing

---

## Estimated Resolution Time

| Category | Estimated Time |
|----------|---------------|
| Button icon support | 30 minutes |
| TransitionWrapper zoom type | 15 minutes |
| StoryScene/CanvasZone prop fixes | 45 minutes |
| TimelineViz data structure | 30 minutes |
| ComparisonOverlay prop alignment | 30 minutes |
| Clean up legacy files | 15 minutes |
| Test and verify build | 30 minutes |
| **Total** | **~3 hours** |

---

## Phase 3 Approach

Given these interface mismatches, Phase 3 will focus on:

1. **Standalone Utilities** - Error boundaries, skeleton loaders, accessibility hooks
2. **Documentation** - Component API specifications
3. **Testing Infrastructure** - E2E test setup (doesn't require build)
4. **Performance Monitoring** - Utility functions for metrics

These can be developed independently and integrated once interfaces are aligned.

---

## Next Steps

1. ✅ Document all interface mismatches (this file)
2. Create Phase 3 utilities (error boundaries, loaders, a11y hooks)
3. Update ACX080.md with Phase 2 completion status and known issues
4. Create integration task list for systematic resolution
5. Optionally: Create automated tests to prevent future interface drift

---

## References

- Phase 1 Components: `apps/carbon-acx-web/src/components/`
- Phase 2 Components: `apps/carbon-acx-web/src/components/domain/`, `apps/carbon-acx-web/src/components/scenes/`
- Design System: `apps/carbon-acx-web/src/styles/tokens.css`
- State Management: `apps/carbon-acx-web/src/store/appStore.ts`

---

**Status:** Ready for systematic integration pass
**Blocker:** None - utilities can proceed independently
**Risk:** Low - all issues are interface alignments, no architectural problems
