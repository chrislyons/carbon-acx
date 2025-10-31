# Cloudflare Pages Configuration

**Branch:** `feature/3d-universe`
**Framework preset:** None (Custom)

---

## Required Build Settings

### Build Command
```bash
pnpm build:web
```

**What this does:**
1. Installs dependencies for carbon-acx-web workspace
2. Runs prebuild script (exports CSV data to JSON)
3. Builds the Vite application

### Build Output Directory
```
apps/carbon-acx-web/dist
```

### Root Directory
```
/
```
(Leave as repository root)

---

## Environment Variables

### Required
```
NODE_VERSION=20.19.4
```

**Note:** This should now be automatically detected from `.node-version` file.

### Optional (for production)
```
NODE_ENV=production
```

---

## Build Configuration Files

### 1. `.node-version`
```
20.19.4
```
Tells Cloudflare Pages which Node.js version to use.

### 2. `package.json` (root)
```json
{
  "packageManager": "pnpm@10.5.2",
  "engines": {
    "node": "20.19.4",
    "pnpm": "10.5.2"
  }
}
```

### 3. `.nvmrc`
```
20.19.4
```
For local development with nvm.

---

## Troubleshooting

### Error: "an internal error occurred"

**Possible causes:**

1. **Build command incorrect**
   - ✅ Should be: `pnpm build:web`
   - ❌ Not: `npm run build` or `pnpm build`

2. **Output directory incorrect**
   - ✅ Should be: `apps/carbon-acx-web/dist`
   - ❌ Not: `dist` or `build`

3. **Node version mismatch**
   - ✅ Fixed by `.node-version` file
   - Verify in Pages settings: Environment Variables → NODE_VERSION

4. **Missing dependencies during build**
   - The `build:web` script includes `--frozen-lockfile` to ensure reproducible builds
   - `pnpm-lock.yaml` must be committed to repo

5. **Out of memory**
   - Three.js bundle is large (~866KB)
   - May need to configure Pages build timeout/memory

### Verify Local Build Works

```bash
# Clean install
rm -rf node_modules apps/*/node_modules site/node_modules
pnpm install

# Test build
pnpm build:web

# Should output to: apps/carbon-acx-web/dist/
ls -la apps/carbon-acx-web/dist/
```

### Check Build Output

Expected structure:
```
apps/carbon-acx-web/dist/
├── index.html
├── assets/
│   ├── index-*.js (main bundle)
│   ├── DataUniverse-*.js (lazy loaded)
│   ├── index-*.css
│   └── ...
└── api/ (prebuild exports)
    ├── sectors.json
    ├── emission-factors.json
    └── profiles/
```

---

## Cloudflare Pages Dashboard Configuration

### Step 1: Go to Pages Project Settings

1. Navigate to Cloudflare Dashboard
2. Select your Pages project
3. Go to Settings → Builds & deployments

### Step 2: Configure Build Settings

**Framework preset:** None

**Build command:**
```
pnpm build:web
```

**Build output directory:**
```
apps/carbon-acx-web/dist
```

**Root directory (advanced):**
```
/
```

### Step 3: Environment Variables

Add if not automatically detected:

| Variable | Value | Scope |
|----------|-------|-------|
| NODE_VERSION | 20.19.4 | Production & Preview |
| NODE_ENV | production | Production only |

### Step 4: Build Configuration

**Node.js version:** Auto-detected from `.node-version` ✅

**Package manager:** pnpm (auto-detected from `package.json` packageManager field)

---

## Common Issues

### Issue: "Command not found: pnpm"

**Fix:** Ensure `package.json` has:
```json
"packageManager": "pnpm@10.5.2"
```

Cloudflare Pages will automatically install pnpm based on this field.

### Issue: "Build exceeds time limit"

**Fix:**
1. Check if prebuild script is taking too long
2. Consider reducing API export in `apps/carbon-acx-web/scripts/export-data.ts`
3. Use Pages Pro plan for longer build times

### Issue: "Three.js SSR error"

**Fix:** ✅ Already resolved with React.lazy() + Suspense
- Pages/CalculatorPage.tsx
- Pages/ExplorePage.tsx
- Pages/InsightsPage.tsx

All use lazy loading pattern.

### Issue: "Module not found"

**Fix:** Ensure all imports use correct paths:
```typescript
// ✅ Correct
import { DataUniverse } from '../components/viz/DataUniverse'

// ❌ Wrong
import { DataUniverse } from '@/components/viz/DataUniverse'
```

---

## Deployment Workflow

### Automatic Deployments

Cloudflare Pages automatically deploys when:
- ✅ Push to `feature/3d-universe` branch (preview)
- ✅ Merge to `main` branch (production)

### Manual Deployment

From CLI:
```bash
# Install Wrangler
npm install -g wrangler

# Build locally
pnpm build:web

# Deploy manually (if needed)
wrangler pages deploy apps/carbon-acx-web/dist --project-name=carbon-acx
```

---

## Verification Checklist

Before debugging build failures, verify:

- [ ] `.node-version` file exists with `20.19.4`
- [ ] `pnpm-lock.yaml` is committed
- [ ] Local build succeeds: `pnpm build:web`
- [ ] Output directory exists: `apps/carbon-acx-web/dist/`
- [ ] `index.html` exists in dist
- [ ] Cloudflare Pages build command is `pnpm build:web`
- [ ] Cloudflare Pages output directory is `apps/carbon-acx-web/dist`
- [ ] No hardcoded `NODE_VERSION` env var (should auto-detect from `.node-version`)

---

## Support

If build still fails:
1. Check Cloudflare Pages build logs (Functions tab → Deployment details)
2. Compare with successful local build
3. Verify all settings match this document
4. Check Cloudflare status page for platform issues

---

**Last Updated:** 2025-10-27
**Branch:** feature/3d-universe
**Build Status:** Local ✅ | Pages ⚠️ (pending retry after .node-version fix)
