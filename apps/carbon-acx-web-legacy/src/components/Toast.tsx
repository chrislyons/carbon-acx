// apps/carbon-acx-web/src/components/Toast.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const icons: Record<ToastType, JSX.Element> = {
    success: <CheckCircle2 className="h-5 w-5 text-accent-success" />,
    error: <XCircle className="h-5 w-5 text-accent-danger" />,
    info: <Info className="h-5 w-5 text-accent-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />, // new
  };

  const colors: Record<ToastType, string> = {
    success: 'border-accent-success/30 bg-accent-success/10',
    error: 'border-accent-danger/30 bg-accent-danger/10',
    info: 'border-accent-500/30 bg-accent-500/10',
    warning: 'border-amber-400/30 bg-amber-50 dark:bg-amber-500/10', // new
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm max-w-md ${colors[toast.type]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 pt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-text-secondary mt-1">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-surface-hover transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-text-muted" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const target = typeof document !== 'undefined' ? document.body : null;
  if (!target) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    target
  );
}

export default ToastContainer;

