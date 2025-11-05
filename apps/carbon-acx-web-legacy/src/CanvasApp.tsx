/**
 * CanvasApp - Main Application Entry Point
 *
 * Single-router architecture for carbon accounting app.
 * Consolidates all routes in one place.
 *
 * Uses:
 * - React Router (BrowserRouter) for navigation
 * - Zustand for app state
 * - Simple CSS classes for layout
 */

import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from './hooks/useAppStore';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import { Toaster } from 'sonner';

// Lazy-loaded pages
const WelcomePage = React.lazy(() => import('./pages/WelcomePage'));
const CalculatorPage = React.lazy(() => import('./pages/CalculatorPage'));
const ExplorePage = React.lazy(() => import('./pages/ExplorePage'));
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'));

// Styles
import './styles/tokens.css';
import './styles/canvas.css';
import './index.css';

function LoadingFallback() {
  return (
    <div className="canvas-hero">
      <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
    </div>
  );
}

function RootRedirect() {
  const activities = useAppStore((state) => state.activities);
  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);

  // If user has data, go to explore; otherwise show welcome
  if (activities.length > 0 || getTotalEmissions() > 0) {
    return <Navigate to="/explore" replace />;
  }

  return <Navigate to="/welcome" replace />;
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      <ErrorBoundary>
        <React.Suspense fallback={<LoadingFallback />}>
          <RootRedirect />
        </React.Suspense>
      </ErrorBoundary>

      {/* Debug Panel (development only) */}
      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}

// Enhanced error fallback component
function RouterErrorFallback() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--carbon-high-bg)' }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: 'var(--carbon-high)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1
          className="font-bold mb-4"
          style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--text-primary)' }}
        >
          Something Went Wrong
        </h1>
        <p
          className="mb-8"
          style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}
        >
          We encountered an unexpected error. Don't worry, your data is safe. Try reloading the page or returning home.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--interactive-primary)',
              color: 'white',
            }}
          >
            Reload Page
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

// Unified router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouterErrorFallback />,
  },
  {
    path: '/welcome',
    element: (
      <div className="min-h-screen bg-[var(--surface-bg)]">
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingFallback />}>
            <WelcomePage />
          </React.Suspense>
        </ErrorBoundary>
        {import.meta.env.DEV && <DebugPanel />}
      </div>
    ),
  },
  {
    path: '/calculator',
    element: (
      <div className="min-h-screen bg-[var(--surface-bg)]">
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingFallback />}>
            <CalculatorPage />
          </React.Suspense>
        </ErrorBoundary>
        {import.meta.env.DEV && <DebugPanel />}
      </div>
    ),
  },
  {
    path: '/explore',
    element: (
      <div className="min-h-screen bg-[var(--surface-bg)]">
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingFallback />}>
            <ExplorePage />
          </React.Suspense>
        </ErrorBoundary>
        {import.meta.env.DEV && <DebugPanel />}
      </div>
    ),
  },
  {
    path: '/insights',
    element: (
      <div className="min-h-screen bg-[var(--surface-bg)]">
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingFallback />}>
            <InsightsPage />
          </React.Suspense>
        </ErrorBoundary>
        {import.meta.env.DEV && <DebugPanel />}
      </div>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function CanvasApp() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            fontSize: 'var(--font-size-sm)',
          },
        }}
      />
    </>
  );
}

function DebugPanel() {
  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
  const activities = useAppStore((state) => state.activities);

  const totalEmissions = getTotalEmissions();

  return (
    <div
      className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-secondary)',
        maxWidth: '300px',
        zIndex: 9999,
      }}
    >
      <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Debug Info
      </div>
      <div className="space-y-1">
        <div>Activities: {activities.length}</div>
        <div>Emissions: {(totalEmissions / 1000).toFixed(1)}t CO₂/yr</div>
      </div>
    </div>
  );
}
