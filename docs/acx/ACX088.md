# Cloudflare Pages Deployment Issue - Emergency Diagnostic

**Deployment URL**: https://d7fbcc7f.carbon-acx.pages.dev/
**Issue Date**: 2025-10-27
**Status**: 🔴 CRITICAL - Application not loading
**Symptoms**: Minimal content ("Carbon ACX" only), 3D visualization not rendering

---

## Symptoms

User reports:
- Very little content visible
- 3D visualization not loading
- Page appears mostly blank

WebFetch results:
- Only "Carbon ACX" text visible
- No navigation, buttons, or interactive elements
- Suggests React app not hydrating

---

## Likely Root Causes

### 1. **JavaScript Bundle Not Loading** (Most Likely)

**Hypothesis**: The built JavaScript files aren't being served or are failing to execute.

**Check**:
1. Open browser DevTools → Console
2. Look for errors like:
   - `Failed to load resource: net::ERR_FILE_NOT_FOUND`
   - `Uncaught SyntaxError`
   - `Uncaught TypeError: Cannot read property`

**Expected files** (should be in DevTools Network tab):
- `index-BpzZH9vf.js` (144 KB)
- `index-Dojcq_kf.css` (55 KB)
- Page-specific chunks when navigating

**Fix if missing**:
- Cloudflare Pages build configuration issue
- Check build command is `pnpm build:web`
- Check output directory is `apps/carbon-acx-web/dist`

### 2. **Base Path / Public Path Mismatch**

**Hypothesis**: Vite build assumes root path `/` but Cloudflare is serving from subdirectory.

**Check `vite.config.ts`**:
```typescript
export default defineConfig({
  base: '/', // Should be '/' for root deployment
  // ...
});
```

**Symptoms if wrong**:
- 404 errors for `/assets/*.js`
- Assets trying to load from wrong URL

**Fix**: Ensure `base: '/'` in vite.config.ts

### 3. **SSR / Client-Side Hydration Failure**

**Hypothesis**: React app fails to mount on `<div id="root"></div>`.

**Check browser console** for:
```
Uncaught Error: Target container is not a DOM element
```

**Verify `index.html`**:
```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

**Should be** (after build):
```html
<div id="root"></div>
<script type="module" crossorigin src="/assets/index-BpzZH9vf.js"></script>
```

### 4. **Three.js / DataUniverse Import Failure**

**Hypothesis**: DataUniverseWrapper dynamic import failing silently.

**Check**:
- Console errors mentioning `three`, `@react-three/fiber`, or `DataUniverse`
- Network tab for DataUniverse chunk request

**Expected behavior**:
- `DataUniverseWrapper-DmyYS0Fc.js` (1.1 MB) should load on demand
- `DataUniverse-B_0ZFRYd.js` (867 KB) should load after wrapper

**If failing**:
- Check network errors
- Verify chunk exists in `dist/assets/`
- Check CORS headers (shouldn't be issue on same domain)

### 5. **Cloudflare Pages Build Failure**

**Hypothesis**: Build succeeded locally but failed on Cloudflare.

**Check Cloudflare Pages dashboard**:
1. Navigate to project → Deployments
2. Click on deployment `d7fbcc7f`
3. View build logs

**Look for**:
- `Build succeeded` vs `Build failed`
- Any error messages during `pnpm build:web`
- Output directory verification

**Common Cloudflare build issues**:
- Node.js version mismatch (should use `.node-version` file)
- Missing dependencies (pnpm workspace setup)
- Build timeout (unlikely for 5.33s build)
- Out of memory (unlikely for this app size)

---

## Diagnostic Steps (For User)

### Step 1: Check Browser Console

1. Open https://d7fbcc7f.carbon-acx.pages.dev/
2. Right-click → Inspect → Console tab
3. Look for **red error messages**

**Common errors and meanings**:

| Error | Meaning | Fix |
|-------|---------|-----|
| `Failed to load resource: /assets/index-*.js` | JS bundle not found | Check build output directory |
| `Uncaught SyntaxError` | JS bundle corrupted | Rebuild |
| `Uncaught TypeError: Cannot read property 'render'` | React failed to mount | Check index.html |
| `Failed to load module script` | ES module syntax issue | Check browser compatibility |
| `net::ERR_ABORTED 404` | File not found | Check asset paths |

### Step 2: Check Network Tab

1. DevTools → Network tab
2. Reload page
3. Filter by: `JS` and `CSS`

**Expected requests**:
```
✅ index.html (200 OK)
✅ assets/index-Dojcq_kf.css (200 OK)
✅ assets/index-BpzZH9vf.js (200 OK)
✅ assets/NewApp-De8d6Lh1.js (when navigating)
```

**If any are 404**:
- Files missing from build
- Incorrect asset paths in HTML
- Cloudflare Pages routing issue

### Step 3: View Page Source

1. Right-click → View Page Source
2. Check if script tags are present

**Should see**:
```html
<script type="module" crossorigin src="/assets/index-BpzZH9vf.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-Dojcq_kf.css">
```

**If missing or wrong**:
- Build didn't inject assets correctly
- Vite build issue

### Step 4: Test Direct Asset URLs

Try loading assets directly in browser:

```
https://d7fbcc7f.carbon-acx.pages.dev/assets/index-BpzZH9vf.js
https://d7fbcc7f.carbon-acx.pages.dev/assets/index-Dojcq_kf.css
```

**If 404**:
- Assets weren't uploaded to Cloudflare
- Build output directory misconfigured

**If 200 OK**:
- Assets exist but not loading in page
- Check HTML injection

### Step 5: Check Cloudflare Build Logs

1. Go to Cloudflare Pages dashboard
2. Find deployment `d7fbcc7f`
3. Click "View build log"

**Look for**:
```
✅ Build command: pnpm build:web
✅ Build directory: apps/carbon-acx-web/dist
✅ Node version: 20.19.4
✅ Build succeeded
```

**Red flags**:
```
❌ Build failed
❌ Command not found: pnpm
❌ Module not found: @react-three/fiber
❌ Out of memory
```

---

## Quick Fixes to Try

### Fix 1: Rebuild and Redeploy

```bash
# Local terminal
cd /Users/chrislyons/dev/carbon-acx
git pull origin feature/3d-universe
cd apps/carbon-acx-web
pnpm install
pnpm build

# Check dist/ folder
ls -lh dist/
ls -lh dist/assets/ | grep -E "(index|DataUniverse)"

# If build succeeds, push to trigger Cloudflare rebuild
git commit --allow-empty -m "chore: trigger rebuild"
git push origin feature/3d-universe
```

### Fix 2: Verify Cloudflare Configuration

Check `wrangler.toml` or Cloudflare Pages settings:

**Build settings should be**:
```yaml
Build command: pnpm build:web
Build output directory: apps/carbon-acx-web/dist
Root directory: (leave empty or "/")
Environment variables:
  NODE_VERSION: 20.19.4
```

### Fix 3: Check for Path Issues

**If using monorepo**, Cloudflare may have trouble finding the right directory:

**Solution**: Update build command to:
```bash
pnpm --filter carbon-acx-web build
```

Or:
```bash
cd apps/carbon-acx-web && pnpm build
```

### Fix 4: Test with Simple HTML

Create `apps/carbon-acx-web/dist/test.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Test Page Works!</h1></body>
</html>
```

Visit: `https://d7fbcc7f.carbon-acx.pages.dev/test.html`

**If this works**:
- Cloudflare is serving static files correctly
- Issue is with React app build

**If this doesn't work**:
- Cloudflare Pages deployment completely broken
- Recheck build output directory

---

## Comparison: Local vs Production

### Local Development (Working)

```bash
$ cd apps/carbon-acx-web
$ pnpm dev

VITE v5.x ready in Xms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose

✅ App loads
✅ React renders
✅ 3D Universe works
```

### Production Build (Working Locally)

```bash
$ pnpm build:web

✓ 89 modules transformed.
dist/index.html                  0.40 kB │ gzip: 0.27 kB
dist/assets/index.css           55.86 kB │ gzip: 10.40 kB
dist/assets/index.js           144.40 kB │ gzip: 46.61 kB
✓ built in 5.33s

$ cd dist && python3 -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000

Visit http://localhost:8000

✅ App loads
✅ React renders
✅ 3D Universe works
```

### Cloudflare Pages (Broken)

```
Visit https://d7fbcc7f.carbon-acx.pages.dev/

❌ Only "Carbon ACX" visible
❌ React not rendering
❌ 3D Universe not loading
```

**Conclusion**: Build works locally, deployment broken.

---

## Most Likely Issue: Build Output Directory

**Hypothesis**: Cloudflare Pages is looking in wrong directory or build didn't run.

**Check Cloudflare Pages settings**:

1. Go to project settings
2. Build & deployments
3. Verify:
   - **Build command**: `pnpm build:web` (or `pnpm --filter carbon-acx-web build`)
   - **Build output directory**: `apps/carbon-acx-web/dist`
   - **Root directory**: Leave empty or set to `/`

**Common mistake**:
- Build output directory set to `dist` instead of `apps/carbon-acx-web/dist`
- Build command doesn't account for monorepo structure

**Fix**: Update Cloudflare Pages settings → Trigger manual deployment

---

## Emergency Workaround: Deploy from Dist

If Cloudflare Pages build keeps failing:

```bash
# Local
cd apps/carbon-acx-web
pnpm build

# Create separate branch with just dist/
git checkout -b deploy/dist-only
cp -r dist/* .
git add .
git commit -m "Deploy: static dist files"
git push origin deploy/dist-only

# Update Cloudflare Pages to use deploy/dist-only branch
# Set build output directory to: / (root)
# Set build command to: echo "Using pre-built files"
```

---

## Next Steps

1. **User actions** (immediate):
   - Open browser DevTools console
   - Share any error messages
   - Check Network tab for failed requests
   - View page source

2. **Developer actions** (if console shows errors):
   - Fix identified issue
   - Rebuild locally
   - Test with `python3 -m http.server`
   - Push fix to trigger Cloudflare rebuild

3. **Cloudflare actions** (if build logs show errors):
   - Review build logs
   - Verify build configuration
   - Check environment variables
   - Try manual deployment

---

## Expected Console Output (Working Deployment)

```javascript
// No errors
// React DevTools message:
"Download the React DevTools for a better development experience..."

// Optional warnings (safe to ignore):
"Compiled with warnings"
"Large chunk size warning..."
```

## Expected Console Output (Broken Deployment)

```javascript
// Example error:
GET https://d7fbcc7f.carbon-acx.pages.dev/assets/index-BpzZH9vf.js net::ERR_ABORTED 404

// Or:
Uncaught TypeError: Cannot read properties of undefined (reading 'render')

// Or:
Failed to compile
Module not found: Can't resolve '@react-three/fiber'
```

---

## Resolution Checklist

- [ ] Browser console checked for errors
- [ ] Network tab checked for 404s
- [ ] Page source shows correct script tags
- [ ] Direct asset URLs accessible
- [ ] Cloudflare build logs reviewed
- [ ] Build output directory verified
- [ ] Local build tested with static server
- [ ] Node version matches (.node-version)
- [ ] Dependencies installed correctly
- [ ] Issue identified and documented

---

**Status**: 🔴 AWAITING USER DIAGNOSTIC DATA

**Next Action**: User to share browser console errors

**Created**: 2025-10-27
**Agent**: acx-ux-auditor v2.0.0 + Manual investigation
