import { useMemo, useState } from 'react';

import '../index.css';

const DEFAULT_LEGACY_PATH = '/legacy';

function resolveLegacyUrl(): string {
  const configured = (import.meta.env.ACX_LEGACY_ORIGIN ?? import.meta.env.VITE_ACX_LEGACY_ORIGIN)?.toString().trim();
  if (!configured) {
    return DEFAULT_LEGACY_PATH;
  }
  try {
    return new URL(configured, window.location.href).toString();
  } catch (error) {
    console.warn('Invalid ACX legacy origin provided. Falling back to default path.', error);
    return DEFAULT_LEGACY_PATH;
  }
}

export default function LegacyApp() {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const legacyUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LEGACY_PATH;
    }
    return resolveLegacyUrl();
  }, []);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Carbon ACX</p>
          <h1 className="text-3xl font-semibold">Legacy experience</h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            The legacy interface is still available for teams that have not migrated to the refreshed Carbon ACX
            workspace. If this frame does not load, verify that the deployment exposes the legacy bundle under the
            expected <code>ACX_LEGACY_ORIGIN</code> location.
          </p>
        </header>
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-lg">
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
              Loading the legacy workspace…
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-danger" role="alert">
              We were unable to load the legacy workspace from {legacyUrl}. Check that the asset is still published or
              update <code>ACX_LEGACY_ORIGIN</code>.
            </div>
          )}
          <iframe
            title="Carbon ACX legacy interface"
            src={legacyUrl}
            className="h-[70vh] w-full border-0"
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            allow="clipboard-write; fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
