/**
 * ErrorBoundary - Graceful error handling for React components
 *
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Logs error details for debugging
 * - Shows fallback UI instead of crashing
 * - Reset functionality to retry
 * - Design token consistency
 *
 * Phase 3 Week 7 implementation
 */

import * as React from 'react';
import { Button } from './Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// Component
// ============================================================================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might send to error tracking service (Sentry, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.reset);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

// ============================================================================
// Default Fallback UI
// ============================================================================

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-[var(--space-8)]"
      style={{
        backgroundColor: 'var(--surface-bg)',
      }}
    >
      <div
        className="max-w-2xl w-full p-[var(--space-8)] rounded-[var(--radius-xl)]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '2px solid var(--carbon-high)',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-[var(--space-6)]"
          style={{
            backgroundColor: 'var(--carbon-high-bg)',
          }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: 'var(--carbon-high)' }} />
        </div>

        {/* Heading */}
        <h1
          className="text-center font-bold mb-[var(--space-3)]"
          style={{
            fontSize: 'var(--font-size-3xl)',
            color: 'var(--text-primary)',
          }}
        >
          Something Went Wrong
        </h1>

        {/* Description */}
        <p
          className="text-center mb-[var(--space-6)]"
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--text-secondary)',
          }}
        >
          We encountered an unexpected error. You can try refreshing the page or contact support if
          the problem persists.
        </p>

        {/* Error message */}
        <div
          className="mb-[var(--space-6)] p-[var(--space-4)] rounded-[var(--radius-md)]"
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-[var(--space-2)]">
            <span
              className="font-medium"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Error Details
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 rounded-[var(--radius-sm)] transition-colors"
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
                backgroundColor: showDetails ? 'var(--surface-elevated)' : 'transparent',
              }}
              aria-expanded={showDetails}
            >
              {showDetails ? 'Hide' : 'Show'}
            </button>
          </div>

          {showDetails && (
            <div
              className="p-[var(--space-3)] rounded-[var(--radius-sm)] overflow-auto max-h-64"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {error.name}: {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-[var(--space-3)]">
          <Button
            variant="primary"
            size="lg"
            onClick={reset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </Button>
        </div>

        {/* Help text */}
        <p
          className="text-center mt-[var(--space-6)]"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-tertiary)',
          }}
        >
          Error ID: {Date.now()} • {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Hook Version (for functional components)
// ============================================================================

export interface UseErrorHandler {
  error: Error | null;
  setError: (error: Error | null) => void;
  reset: () => void;
}

/**
 * Hook for manual error handling in functional components
 *
 * @example
 * function MyComponent() {
 *   const { error, setError, reset } = useErrorHandler();
 *
 *   const handleAction = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (err) {
 *       setError(err);
 *     }
 *   };
 *
 *   if (error) {
 *     return <ErrorFallback error={error} reset={reset} />;
 *   }
 *
 *   return <div>...</div>;
 * }
 */
export function useErrorHandler(): UseErrorHandler {
  const [error, setError] = React.useState<Error | null>(null);

  const reset = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, setError, reset };
}
