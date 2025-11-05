import { Suspense } from 'react';
import { Await, useLoaderData, useParams } from 'react-router-dom';

import type { DatasetDetail, ReferenceSummary } from '../lib/api';
import VisualizationCanvas, { CanvasSkeleton } from './VisualizationCanvas';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useDataset, useReferences } from '../hooks/useDataset';

interface DatasetLoaderData {
  dataset: Promise<DatasetDetail>;
  references: Promise<ReferenceSummary[]>;
}

export default function DatasetView() {
  const data = useLoaderData() as DatasetLoaderData;
  const params = useParams();

  if (!params.datasetId) {
    return (
      <div className="flex flex-col gap-6">
        <VisualizationCanvas isLoading />
      </div>
    );
  }

  return (
    <Suspense fallback={<DatasetSkeleton />}>
      <Await resolve={Promise.all([data.dataset, data.references])}>
        {([dataset, references]) => (
          <DatasetContent
            datasetId={params.datasetId!}
            fallbackDataset={dataset}
            fallbackReferences={references}
            sectorId={params.sectorId}
          />
        )}
      </Await>
    </Suspense>
  );
}

function DatasetContent({
  datasetId,
  fallbackDataset,
  fallbackReferences,
  sectorId,
}: {
  datasetId: string;
  fallbackDataset: DatasetDetail;
  fallbackReferences: ReferenceSummary[];
  sectorId?: string;
}) {
  const payload = { dataset: fallbackDataset, references: fallbackReferences };
  const datasetState = useDataset(datasetId, { fallbackData: payload });
  const referencesState = useReferences(datasetId, { fallbackData: payload });

  const dataset = datasetState.data ?? fallbackDataset;
  const references = referencesState.data ?? fallbackReferences;

  return (
    <div className="flex flex-col gap-6">
      <VisualizationCanvas
        dataset={datasetState.data ?? fallbackDataset}
        isLoading={datasetState.isLoading && !datasetState.data}
        error={datasetState.error ?? undefined}
      />
      <DatasetMetaCard
        dataset={dataset}
        referencesCount={references?.length ?? 0}
        sectorId={sectorId}
      />
    </div>
  );
}

function DatasetMetaCard({
  dataset,
  referencesCount,
  sectorId,
}: {
  dataset: DatasetDetail;
  referencesCount: number;
  sectorId?: string;
}) {
  return (
    <Card className="border-border/80 bg-surface/90">
      <CardHeader>
        <CardTitle>Dataset overview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm text-text-secondary sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Dataset ID</p>
          <p className="font-medium text-foreground">{dataset.datasetId}</p>
          {dataset.title && <p className="text-text-muted">{dataset.title}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Sector</p>
          <p className="font-medium text-foreground">{sectorId ?? 'Unassigned'}</p>
          <p className="text-text-muted">{dataset.figureCount ?? 0} visual figures detected.</p>
        </div>
        {dataset.manifestPath && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Manifest</p>
            <p>
              <code className="rounded bg-neutral-900/5 px-2 py-1 text-xs text-text-secondary">{dataset.manifestPath}</code>
            </p>
            {dataset.manifestSha256 && (
              <p className="text-xs text-text-muted">sha256: {dataset.manifestSha256}</p>
            )}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">References</p>
          <p className="font-medium text-foreground">{referencesCount}</p>
          <p className="text-text-muted">
            {referencesCount > 0
              ? 'Open the inspector panel to review citations.'
              : 'No references supplied for this dataset.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-lg">
        <Skeleton className="mb-4 h-5 w-1/4" />
        <CanvasSkeleton />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
