/**
 * CanvasApp - Simplified Entry Point
 *
 * Removed:
 * - XState journey machine (replaced with React Router)
 * - CanvasZone complexity (replaced with simple CSS classes)
 * - Over-engineered state orchestration
 *
 * Uses:
 * - React Router for navigation
 * - Zustand for app state
 * - Simple CSS classes for layout
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function CanvasApp() {
  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      <BrowserRouter>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/insights" element={<InsightsPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </BrowserRouter>

      {/* Debug Panel (development only) */}
      {import.meta.env.DEV && <DebugPanel />}
    </div>
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
