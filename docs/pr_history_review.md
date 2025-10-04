# Pull request history review

## Methodology
- Enumerated every merged pull request using `git log --merges --oneline` to establish a complete timeline of feature, data, and infrastructure work.【e7a342†L1-L143】
- Inspected targeted fix commits (`git log --grep fix`) to trace regressions and follow-up corrections that indicate quality gaps.【88c3fb†L1-L48】

## Delivery phases and notable risks

### 1. Foundation and early data scaffolding (PRs #4–#44)
- Rapid successive documentation fixes were required to remove banned terminology (`FastAPI`), revealing a review gap that let failing compliance checks reach `main`.【e7a342†L98-L112】【88c3fb†L28-L32】
- Output directory guardrails had to be reworked twice (#37, #39) because Makefile recipes conflicted with new safety checks, suggesting the initial change skipped end-to-end make invocations.【e7a342†L107-L110】【88c3fb†L30-L31】
- Early CI and packaging efforts landed iteratively (#41–#45) with minimal rollback, but the absence of regression tests for documentation allowed repeated corrections.

### 2. Hosting, routing, and artifact delivery (PRs #63–#87)
- Multiple back-to-back fixes were needed for static hosting: routing (#85), CORS/service worker purging (#86), and live compute 404s (#78).【e7a342†L65-L83】【88c3fb†L14-L19】 These regressions point to insufficient integration tests for Cloudflare Pages and Worker deployments.
- Diagnostic PRs (#76, #83) indicate that artifact fetch paths and exports lacked automated coverage, motivating the later addition of visual smoke tests (#63) but leaving room for end-to-end deployment verification.

### 3. Rich UI iteration and compute hardening (PRs #94–#132)
- Base-path and asset resolution required emergency fixes (#102, #104) shortly after significant UI refactors, implying that static-site tests did not cover nested deployments or offline bundles.【e7a342†L42-L49】
- The "exercise and fix" effort (#142) followed font-scaling and layout updates, revealing that accessibility and keyboard regression tests were reactive rather than proactive despite earlier accessibility PRs (#81).【e7a342†L9-L10】【e7a342†L68-L75】

### 4. Recent data expansions and accessibility polish (PRs #133–#151)
- Two consecutive "fix blank screen" merges (#138, #139) and additional follow-up commits to restore callback signatures (`0338f1e`) show that large UI rewrites shipped without adequate smoke coverage for the Dash client.【e7a342†L13-L16】【88c3fb†L3-L7】
- The new agency KPI strip needed an immediate ARIA fix after landing (#146 → `ef5edf7`), highlighting the lack of automated accessibility linting for custom components.【e7a342†L6-L7】【88c3fb†L1-L3】
- Despite major dataset additions (#147–#150), there is no accompanying update to automated documentation or release notes beyond ad-hoc README edits, risking drift between data coverage and published guidance.

## Patterns of missteps and missed bugs
- **Documentation compliance gaps** – Repeated README fixes demonstrate that spec requirements (e.g., forbidden terms) are easy to violate without tooling support. Automated lint rules or pre-commit hooks could prevent future breaches.【e7a342†L107-L112】
- **Deployment regressions** – Hosting-related bugs recur whenever bundling logic changes, indicating missing integration tests that emulate Cloudflare Pages/Worker environments before merge.【e7a342†L65-L83】【88c3fb†L14-L19】
- **UI regressions after large refactors** – Major layout or navigation updates often required emergency fixes (#138–#142), suggesting the need for smoke tests that load the Dash app and React bundle with representative artefacts.【e7a342†L10-L16】【88c3fb†L3-L7】
- **Accessibility catch-up** – Accessibility improvements typically trail new components (e.g., agency strip ARIA fix), implying that manual audits happen only post-merge. Introducing automated axe/pa11y runs in CI would surface issues earlier.【e7a342†L6-L7】【88c3fb†L1-L3】

## Recommendations
1. **Expand automated smoke coverage** for Dash and static bundles using headless browsers to catch blank screens, routing errors, and focus regressions before release.
2. **Add hosting integration checks** (e.g., Pages Function + Worker contract tests) that assert correct headers, CORS behaviour, and API availability after build steps.
3. **Codify documentation rules** with lint scripts (regex guards for banned tokens) and include README snapshots in CI to avoid repeated compliance PRs.
4. **Institutionalise accessibility testing** by running automated a11y audits on key pages/components and enforcing ARIA review in PR templates.
5. **Align data updates with documentation** via changelog automation or dataset coverage dashboards so large seed expansions automatically trigger doc updates.

## Follow-up actions on this branch
- Added `scripts.lint_docs` and wired it into `make lint` so README and docs fail CI when banned terminology like "FastAPI" appears.
