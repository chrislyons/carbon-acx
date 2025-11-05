import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    node?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus({ preventScroll: true });
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const target = typeof document !== 'undefined' ? document.body : null;
  if (!target) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="bg-surface border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        ref={dialogRef}
        tabIndex={-1}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="settings-modal-title" className="text-lg font-semibold text-foreground">
            Settings
          </h2>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </header>

        <div className="p-4 space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
            <p className="text-sm text-text-muted">
              Carbon ACX is an open reference stack for trustworthy carbon accounting.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Version</h3>
            <p className="text-sm text-text-muted">
              ACX 0.4.1
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Resources</h3>
            <div className="space-y-2">
              <a
                href="https://github.com/chrislyons/carbon-acx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent-500 hover:text-accent-600 block"
              >
                View on GitHub
              </a>
              <a
                href="https://github.com/chrislyons/carbon-acx/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent-500 hover:text-accent-600 block"
              >
                Documentation
              </a>
            </div>
          </section>
        </div>

        <footer className="p-4 border-t border-border">
          <Button
            onClick={onClose}
            className="w-full"
            variant="outline"
          >
            Close
          </Button>
        </footer>
      </div>
    </div>,
    target
  );
}

export default SettingsModal;
