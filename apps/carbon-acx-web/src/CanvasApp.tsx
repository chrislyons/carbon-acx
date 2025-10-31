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

// Unified router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: (
      <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center">
        <div style={{ color: 'var(--text-primary)' }}>
          An error occurred. Please refresh the page.
        </div>
      </div>
    ),
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
  return <RouterProvider router={router} />;
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
