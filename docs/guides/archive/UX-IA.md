# Carbon ACX new workspace IA

The refreshed Carbon ACX workspace introduces a three-pane layout optimised for rapid exploration of sectors, datasets, and
their associated evidence. The navigation sidebar is now search-forward, the central canvas focuses on scope and figures, and
the inspector tracks references without blocking the main task flow. Route-level code splitting keeps the first paint focused on
the navigation shell and defers heavier dataset bundles until a user drills in.

![Workspace overview](../artifacts/new-ui-overview.png)

## Interaction flow

1. **Sector selection** – the left rail lists available sectors with keyboard focus management and live filtering.
2. **Scope + profiles** – the central column guides analysts through scope context, available profiles, and the most recent
dataset call-to-action.
3. **Dataset inspection** – datasets open inline and render chart figures with memoised, animated components to stay responsive.
4. **Reference review** – references stream into the inspector with windowed virtualisation so long bibliographies stay smooth on
modest devices.

![Dataset detail view](../artifacts/new-ui-dataset.png)

## Migration guard rails

The UI ships behind an `ACX_NEW_UI` environment flag. This allows staging environments to roll out progressively while keeping
the legacy shell accessible through the legacy iframe bridge. When the flag is enabled, only the new bundles are imported, so the
legacy assets are not downloaded by mistake.

## Performance tactics

- React Router routes now lazy-load with a shared suspense fallback to trim the initial payload.
- Heavy chart components are wrapped in `React.memo` to avoid unnecessary work when state updates in other panes.
- Reference lists render through `@tanstack/react-virtual`, ensuring the inspector remains responsive even with hundreds of
citations.
- The build pipeline generates Brotli and Gzip assets via `vite-plugin-compression`, and `_headers` enforces long-term caching for
fingerprinted bundles.
