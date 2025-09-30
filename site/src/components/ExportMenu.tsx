import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

import { exportView } from '../lib/api';
import { useProfile } from '../state/profile';

export interface ExportMenuProps {
  canvasRef: React.RefObject<HTMLElement | null>;
}

type ExportAction = 'csv' | 'png' | 'references';

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

const PNG_PIXEL_RATIOS: readonly number[] = [2, 1.75, 1.5, 1.25, 1];
const MAX_PNG_BYTES = 1.5 * 1024 * 1024;
const DEFAULT_HASH = 'snapshot';

function fallbackHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [prefix, base64] = dataUrl.split(',', 2);
  const mimeMatch = prefix.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

async function renderCanvasPng(node: HTMLElement): Promise<Blob> {
  const backgroundColor = '#020617';
  let lastBlob: Blob | null = null;
  for (const ratio of PNG_PIXEL_RATIOS) {
    const dataUrl = await toPng(node, {
      pixelRatio: ratio,
      cacheBust: true,
      backgroundColor,
    });
    const blob = dataUrlToBlob(dataUrl);
    lastBlob = blob;
    if (blob.size <= MAX_PNG_BYTES) {
      return blob;
    }
  }
  if (lastBlob) {
    return lastBlob;
  }
  throw new Error('Unable to capture canvas snapshot');
}

function normaliseReferences(references: unknown): string[] {
  if (!Array.isArray(references)) {
    return [];
  }
  return references
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

export function ExportMenu({ canvasRef }: ExportMenuProps): JSX.Element {
  const { profileId, overrides, result, status } = useProfile();

  const sortedOverrides = useMemo(
    () => Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)),
    [overrides]
  );
  const datasetVersion =
    typeof result?.manifest?.dataset_version === 'string' && result.manifest.dataset_version
      ? result.manifest.dataset_version
      : 'unknown';

  const hashSource = useMemo(
    () => JSON.stringify({ profileId, overrides: sortedOverrides, datasetVersion }),
    [profileId, sortedOverrides, datasetVersion]
  );

  const [exportId, setExportId] = useState<string>(DEFAULT_HASH);
  useEffect(() => {
    let cancelled = false;
    async function computeHash(): Promise<void> {
      if (typeof window === 'undefined' || !window.crypto?.subtle) {
        if (!cancelled) {
          setExportId(fallbackHash(hashSource));
        }
        return;
      }
      try {
        const encoded = new TextEncoder().encode(hashSource);
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);
        const hex = Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 8);
        if (!cancelled) {
          setExportId(hex || DEFAULT_HASH);
        }
      } catch (error) {
        if (!cancelled) {
          setExportId(fallbackHash(hashSource));
          console.warn('Failed to compute export hash', error);
        }
      }
    }
    computeHash();
    return () => {
      cancelled = true;
    };
  }, [hashSource]);

  const references = useMemo(() => normaliseReferences(result?.references), [result]);
  const hasResult = result !== null;

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<ExportAction | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen || typeof document === 'undefined') {
      return;
    }
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!feedback || typeof window === 'undefined') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 5000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const handleToggleMenu = () => {
    setMenuOpen((open) => !open);
  };

  const handleExportCsv = async () => {
    if (!hasResult) {
      setFeedback({ type: 'error', message: 'Run a compute cycle before exporting.' });
      return;
    }
    setBusyAction('csv');
    setFeedback(null);
    try {
      const response = await exportView('csv', { profile_id: profileId, overrides });
      const blob = await response.blob();
      const filename = `${exportId}-export.csv`;
      downloadBlob(blob, filename);
      setFeedback({ type: 'success', message: `Downloaded ${filename}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download CSV export.';
      setFeedback({ type: 'error', message });
    } finally {
      setBusyAction((current) => (current === 'csv' ? null : current));
    }
  };

  const handleExportReferences = async () => {
    if (!hasResult) {
      setFeedback({ type: 'error', message: 'References are available after the first compute run.' });
      return;
    }
    setBusyAction('references');
    setFeedback(null);
    try {
      const entries = references.length > 0 ? references.join('\n\n') : 'No references available for the current selection.';
      const blob = new Blob([entries], { type: 'text/plain;charset=utf-8' });
      const filename = `${exportId}-references.txt`;
      downloadBlob(blob, filename);
      setFeedback({ type: 'success', message: `Downloaded ${filename}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export references.';
      setFeedback({ type: 'error', message });
    } finally {
      setBusyAction((current) => (current === 'references' ? null : current));
    }
  };

  const handleExportPng = async () => {
    if (!hasResult) {
      setFeedback({ type: 'error', message: 'Generate a compute snapshot before exporting an image.' });
      return;
    }
    const node = canvasRef.current;
    if (!node) {
      setFeedback({ type: 'error', message: 'Canvas unavailable for export.' });
      return;
    }
    setBusyAction('png');
    setFeedback(null);
    try {
      const blob = await renderCanvasPng(node);
      const filename = `${exportId}-canvas.png`;
      downloadBlob(blob, filename);
      setFeedback({ type: 'success', message: `Downloaded ${filename}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to capture canvas PNG.';
      setFeedback({ type: 'error', message });
    } finally {
      setBusyAction((current) => (current === 'png' ? null : current));
    }
  };

  const actionsDisabled = busyAction !== null || !hasResult;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        onClick={handleToggleMenu}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        Export
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-950/95 p-4 text-sm text-slate-200 shadow-xl ring-1 ring-slate-900/60 backdrop-blur"
          role="menu"
          aria-label="Export options"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
            <span>Downloads</span>
            <span className="font-mono lowercase tracking-tight text-slate-400">{exportId}</span>
          </div>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-sm font-medium transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleExportCsv}
              disabled={actionsDisabled}
            >
              Download CSV dataset
              <p className="mt-1 text-xs font-normal text-slate-400">Full export_view slice with metadata headers.</p>
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-sm font-medium transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleExportPng}
              disabled={actionsDisabled}
            >
              Download canvas PNG
              <p className="mt-1 text-xs font-normal text-slate-400">2× resolution snapshot under 1.5&nbsp;MB.</p>
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-sm font-medium transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleExportReferences}
              disabled={actionsDisabled}
            >
              Download References.txt
              <p className="mt-1 text-xs font-normal text-slate-400">IEEE formatted list in current view order.</p>
            </button>
          </div>
          {!hasResult ? (
            <p className="mt-3 text-xs text-slate-500">
              Exports unlock after the first compute run.
            </p>
          ) : null}
          {feedback ? (
            <div
              className={`mt-3 text-xs ${feedback.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </div>
          ) : null}
          {status === 'loading' ? (
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">
              Recomputing… latest exports reflect last completed run.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

