# ACX090 - DataUniverse 3D Visualization Runtime Error Investigation

**Created:** 2025-10-28
**Status:** 🔴 CRITICAL - Production deployment blocked
**Priority:** P0
**Agent:** Request for autonomous investigation

---

## Problem Statement

The DataUniverse 3D visualization component fails to initialize on Cloudflare Pages deployments with a consistent runtime error, despite successful local builds. The error occurs during module initialization before any user interaction.

**Error Signature:**
```javascript
TypeError: can't access property "S", ge is undefined
Location: /assets/DataUniverse-*.js:3871 (minified production bundle)
Stack: exports → T3 → anonymous (DataUniverse module initialization)
```

**Deployment Environment:**
- Platform: Cloudflare Pages
- Build: Vite 5.4.20 production build
- Framework: React 18.3.1
- Preview URLs showing error: `f1de6db0`, `4be62700`, `703af69b.carbon-acx.pages.dev`

**Local Environment:**
- Build: ✅ Successful (`pnpm build` completes without errors)
- Dev server: ✅ Working (assumed, not explicitly tested)
- Bundle analysis: Clean, no obvious issues

---

## Technical Context

### Component Architecture

**DataUniverseWrapper.tsx** (SSR-safe wrapper):
- Pure client-side dynamic import pattern
- Lazy loads actual DataUniverse component via `import('./DataUniverse')`
- Checks `typeof window !== 'undefined'` before rendering
- Error boundary catches initialization failures

**DataUniverse.tsx** (3D visualization):
```typescript
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

export function DataUniverse({ totalEmissions, activities, ... }) {
  // Uses React Three Fiber's Canvas component
  // Renders Three.js scene with orbital mechanics
  // Multiple sub-components: CentralSphere, OrbitingActivity, CameraAnimator
}
```

### Package Versions

Current (failing):
```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "three": "0.180.0",
  "@react-three/fiber": "9.4.0",
  "@react-three/drei": "10.7.6"
}
```

### Build Configuration

**vite.config.ts** (current state after 5 iteration attempts):
```typescript
export default defineConfig({
  plugins: [react(), sampleQueriesApi(), compression(...)],
  resolve: {
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  ssr: {
    external: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
});
```

---

## Investigation History

### Attempted Solutions (All Failed)

#### Attempt 1: optimizeDeps Configuration
**Hypothesis:** Pre-bundling excluded Three.js, breaking module resolution
**Change:** `optimizeDeps.exclude` → `optimizeDeps.include`
**Result:** ❌ Error persists (optimizeDeps only affects dev mode)
**Commit:** `837088a`

#### Attempt 2: Manual Chunk Splitting
**Hypothesis:** React context duplication between main app and Three.js
**Change:** Added `build.rollupOptions.output.manualChunks`
```typescript
manualChunks(id) {
  if (id.includes('three') || id.includes('@react-three')) return 'three-vendor';
  if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
}
```
**Result:** ❌ Created NEW errors (circular dependencies in vendor chunks)
**Observation:** Bundle split successfully but now both chunks fail to initialize
**Commit:** `fe6a0b2`

#### Attempt 3: Module Deduplication
**Hypothesis:** Multiple React instances despite chunking
**Change:** Added `resolve.dedupe` for React/Three.js packages
**Result:** ❌ Clean build, error persists
**Observation:** Dedupe doesn't affect already-deduplicated monorepo structure
**Commit:** `c8416a4`

#### Attempt 4: CommonJS Transform
**Hypothesis:** ESM/CJS interop issues
**Change:** Added `build.commonjsOptions.transformMixedEsModules`
**Result:** ❌ No effect (all packages are ESM)
**Commit:** Bundled with c8416a4

#### Attempt 5: Config Simplification
**Hypothesis:** Conflicting configuration options
**Change:** Removed duplicate build blocks, minimal config
**Result:** ❌ Error persists with new bundle hash `DataUniverse-CHLYVAyl.js`
**Commit:** `d6c1db6` (current HEAD)

---

## Error Pattern Analysis

### Consistent Characteristics

1. **Location:** Always line 3871 in minified DataUniverse bundle (across different hashes)
2. **Timing:** Module initialization time (before React component renders)
3. **Message:** Property access on undefined object (`ge.S` or similar minified property)
4. **Stack:** `exports` → internal Three.js/R3F function → anonymous module code
5. **Environment:** Only Cloudflare Pages, never local builds

### Variable Characteristics

- Bundle hash changes with each config iteration (expected)
- Property name varies (`"S"`, `"$$"`) due to minification
- Variable name varies (`ge`, `pe`, `me`) due to minification

### Hypothesis: Root Cause Categories

**A. Version Incompatibility (MOST LIKELY)**
- React Three Fiber 9.4.0 may have breaking changes with React 18.3.1
- Three.js 0.180.0 might not be tested with current R3F version
- Drei 10.7.6 may rely on specific R3F internals

**B. Build Environment Difference**
- Cloudflare Pages uses different Node version despite `.node-version` file
- Different build-time globals or environment variables
- Cloudflare's bundler might apply additional transforms

**C. Module Resolution Edge Case**
- Barrel export from '@react-three/drei' causing init order issue
- Tree-shaking removing critical initialization code
- Side-effect imports not being preserved

**D. Source Code Bug**
- Actual logic error in DataUniverse.tsx that only manifests in production
- Missing null checks during initialization
- Async import race condition

---

## Investigation Tasks

### Phase 1: Version Compatibility Testing

**Task 1.1:** Downgrade to Last Known-Good Versions
```bash
cd apps/carbon-acx-web
pnpm add three@0.168.0 @react-three/fiber@8.17.10 @react-three/drei@9.114.3
pnpm build
# Commit, push, wait for Cloudflare preview
```
**Expected:** If this fixes it, confirms version incompatibility

**Task 1.2:** Binary Search Version Space
If 1.1 works, incrementally upgrade packages to find breaking version:
- Upgrade Three.js alone
- Upgrade R3F alone
- Upgrade Drei alone

**Task 1.3:** Check React Three Fiber Changelog
Search for breaking changes between 8.17.10 and 9.4.0:
- React context changes
- Three.js version requirements
- Peer dependency updates

### Phase 2: Build Environment Analysis

**Task 2.1:** Compare Local vs Cloudflare Build
```bash
# Local build
pnpm build
ls -lh dist/assets/DataUniverse-*.js
# Note bundle hash and size

# Check Cloudflare build logs
gh pr view 242 # Find latest deployment
# Compare bundle hash, size, and build command
```

**Task 2.2:** Inspect Cloudflare Build Logs
Look for:
- Node version actually used
- pnpm version
- Environment variables set
- Any warning messages during build
- Post-build transformations

**Task 2.3:** Force Consistent Build
Create `.nvmrc`, update `package.json` engines:
```json
{
  "engines": {
    "node": "20.19.4",
    "pnpm": "10.5.2"
  }
}
```

### Phase 3: Source Code Analysis

**Task 3.1:** Add Debug Logging
Temporarily add console logs to DataUniverse.tsx:
```typescript
console.log('[DataUniverse] Module loading');
console.log('[DataUniverse] THREE version:', THREE.REVISION);
console.log('[DataUniverse] Canvas available:', !!Canvas);
```

**Task 3.2:** Simplify DataUniverse
Create minimal test version:
```typescript
export function DataUniverseTest() {
  return (
    <Canvas>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  );
}
```

**Task 3.3:** Test Individual Imports
```typescript
import { Canvas } from '@react-three/fiber'; // Test alone
import { OrbitControls } from '@react-three/drei'; // Test alone
import { Stars } from '@react-three/drei'; // Test alone
```

### Phase 4: Alternative Solutions

**Task 4.1:** Remove Drei Dependency
Implement OrbitControls, Stars, Html without @react-three/drei:
- Use raw Three.js OrbitControls
- Custom stars implementation
- React portal for HTML overlays

**Task 4.2:** Lazy Load More Aggressively
Split DataUniverse into even smaller chunks:
```typescript
const Canvas = lazy(() => import('@react-three/fiber').then(m => ({ default: m.Canvas })));
const OrbitControls = lazy(() => import('@react-three/drei').then(m => ({ default: m.OrbitControls })));
```

**Task 4.3:** Fallback to 2D Visualization
If all else fails, implement canvas-based 2D projection:
- Use plain `<canvas>` with Canvas API
- Pseudo-3D effect with scaling and positioning
- No Three.js dependency

---

## Success Criteria

1. **Primary:** DataUniverse loads without errors on Cloudflare Pages preview
2. **Secondary:** 3D scene renders correctly (spheres, orbits, labels)
3. **Tertiary:** Interactions work (hover, click, camera controls)
4. **Documentation:** Root cause identified and documented
5. **Prevention:** CI test added to catch similar issues

---

## Files for Investigation

**Priority 1 (Most Likely):**
- `apps/carbon-acx-web/package.json` - Check version constraints
- `apps/carbon-acx-web/src/components/viz/DataUniverse.tsx` - Main component
- `apps/carbon-acx-web/vite.config.ts` - Build configuration
- `pnpm-lock.yaml` - Exact dependency tree

**Priority 2 (Supporting):**
- `apps/carbon-acx-web/src/components/viz/DataUniverseWrapper.tsx` - Dynamic import wrapper
- `.github/workflows/ci.yml` - Build process
- `apps/carbon-acx-web/tsconfig.json` - TypeScript config
- `apps/carbon-acx-web/.env` - Environment variables (if any)

**Priority 3 (Context):**
- `node_modules/@react-three/fiber/package.json` - Check actual installed version
- `node_modules/three/package.json` - Check Three.js version
- Cloudflare Pages deployment settings (not in repo)

---

## Constraints

1. **No Breaking Changes:** Must maintain existing API for DataUniverse component
2. **Performance:** Bundle size should not increase significantly
3. **Compatibility:** Must work with React 18 (cannot downgrade React)
4. **Timeline:** P0 issue blocking production deployment
5. **Monorepo:** Solution must work within pnpm workspace structure

---

## References

- React Three Fiber Docs: https://docs.pmnd.rs/react-three-fiber/getting-started/introduction
- Three.js Docs: https://threejs.org/docs/
- Vite SSR Guide: https://vitejs.dev/guide/ssr.html
- Cloudflare Pages Build Config: https://developers.cloudflare.com/pages/platform/build-configuration/

**Related Issues:**
- ACX085 - SSR fix for DataUniverse (completed)
- ACX086 - Phase 5 3D Universe sprint completion
- ACX087 - UX audit identifying DataUniverse deployment issues

**PR:** #242 (feature/3d-universe branch)
**Latest Commit:** `d6c1db6` (clean config, awaiting test)
**Test URLs:** Check PR #242 comments for latest Cloudflare preview URL

---

## Autonomous Agent Instructions

**You are tasked with:**
1. Systematically execute investigation phases 1-4
2. Document findings in this file (append to new section below)
3. Implement the fix that resolves the issue
4. Create a new commit with clear explanation
5. Update this document with root cause analysis
6. Suggest prevention measures for CI/testing

**Decision Authority:**
- ✅ Change package versions (test in separate commit)
- ✅ Modify vite.config.ts (test in separate commit)
- ✅ Add debug logging temporarily
- ✅ Create simplified test components
- ❌ Remove DataUniverse feature entirely (requires approval)
- ❌ Change React version (requires approval)

**Reporting:**
When complete, append your findings below with:
- Root cause identified (A/B/C/D or new category)
- Solution implemented
- Verification steps taken
- Commit hash(es)
- Recommended prevention measures

---

## Investigation Results

**Assigned Agent:** [Your session will append results here]

**Status:** 🟡 Investigation in progress...

