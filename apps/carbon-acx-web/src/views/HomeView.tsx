import { useOutletContext } from 'react-router-dom';

import type { LayoutOutletContext } from './Layout';

export default function HomeView() {
  const { datasets } = useOutletContext<LayoutOutletContext>();
  const latestDataset = datasets[0];

  return (
    <div className="home-view">
      <h3>Explore Carbon ACX</h3>
      <p>Select a sector from the navigation to load profiles and datasets.</p>
      {latestDataset && (
        <div className="home-view__dataset" aria-live="polite">
          <h4>Latest dataset</h4>
          <p>
            <strong>{latestDataset.datasetId}</strong>
          </p>
          <p>
            Generated at {latestDataset.generatedAt ?? 'an unknown time'} with{' '}
            {latestDataset.figureCount ?? 0} figures available for review.
          </p>
        </div>
      )}
    </div>
  );
}
