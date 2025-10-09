import { useOutletContext } from 'react-router-dom';

import type { LayoutOutletContext } from './Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function HomeView() {
  const { datasets } = useOutletContext<LayoutOutletContext>();
  const latestDataset = datasets[0];

  return (
    <div className="home-view">
      <h3 className="text-2xl font-semibold text-foreground">Explore Carbon ACX</h3>
      <p className="text-sm text-text-muted">Select a sector from the navigation to load profiles and datasets.</p>
      {latestDataset && (
        <Card className="home-view__dataset" aria-live="polite">
          <CardHeader>
            <CardTitle>Latest dataset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left text-sm text-text-secondary">
            <p>
              <strong className="text-base text-foreground">{latestDataset.datasetId}</strong>
            </p>
            <p>
              Generated at {latestDataset.generatedAt ?? 'an unknown time'} with{' '}
              {latestDataset.figureCount ?? 0} figures available for review.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
