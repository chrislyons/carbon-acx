/**
 * DataUniverseWrapper - SSR-Safe wrapper for Three.js DataUniverse
 *
 * This file contains NO Three.js imports at module scope.
 * All Three.js code is dynamically imported at runtime on the client only.
 */

import * as React from 'react';

// Re-export types (these are safe, no imports)
export interface Activity {
  id: string;
  name: string;
  annualEmissions: number;
  category?: string;
  color?: string;
}

export interface DataUniverseProps {
  totalEmissions: number;
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
  enableIntroAnimation?: boolean;
  enableClickToFly?: boolean;
}

function LoadingFallback() {
  return (
    <div
      className="w-full h-full min-h-[600px] flex items-center justify-center"
      style={{ background: '#0a0e27' }}
    >
      <div style={{ color: '#fff', fontSize: '16px' }}>Loading 3D Universe...</div>
    </div>
  );
}

export function DataUniverse(props: DataUniverseProps) {
  const [Component, setComponent] = React.useState<React.ComponentType<DataUniverseProps> | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Dynamically import the actual DataUniverse component
    // This import statement will ONLY execute in the browser
    import('./DataUniverse')
      .then((module) => {
        setComponent(() => module.DataUniverse);
      })
      .catch((err) => {
        console.error('Failed to load DataUniverse:', err);
        setError(err);
      });
  }, []);

  // SSR or before component loaded
  if (typeof window === 'undefined' || !Component) {
    return <LoadingFallback />;
  }

  // Error state
  if (error) {
    return (
      <div
        className="w-full h-full min-h-[600px] flex items-center justify-center"
        style={{ background: '#0a0e27' }}
      >
        <div style={{ color: '#ff0000', fontSize: '14px' }}>
          Failed to load 3D visualization
        </div>
      </div>
    );
  }

  // Render the actual component
  return <Component {...props} />;
}
