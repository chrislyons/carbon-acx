import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { createBrowserRouter, defer } from 'react-router-dom';

import { loadDataset, loadDatasets, loadSector, loadSectors } from './lib/api';

const Layout = lazy(() => import('./views/Layout'));
const HomeView = lazy(() => import('./views/HomeView'));
const SectorView = lazy(() => import('./views/SectorView'));
const DatasetView = lazy(() => import('./views/DatasetView'));
const ErrorView = lazy(() => import('./views/ErrorView'));

function suspenseElement(element: ReactElement, message: string) {
  return (
    <Suspense fallback={<RouteFallback message={message} />}>
      {element}
    </Suspense>
  );
}

function RouteFallback({ message }: { message: string }) {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export const router = createBrowserRouter([
  {
    id: 'layout',
    path: '/',
    element: suspenseElement(<Layout />, 'Loading workspace shell…'),
    loader: async () =>
      defer({
        sectors: loadSectors(),
        datasets: loadDatasets(),
      }),
    errorElement: suspenseElement(<ErrorView title="Navigation error" />, 'Resolving error state…'),
    children: [
      {
        index: true,
        element: suspenseElement(<HomeView />, 'Preparing home view…'),
      },
      {
        id: 'sector',
        path: 'sectors/:sectorId',
        loader: async ({ params }: LoaderFunctionArgs) => {
          const { sectorId } = params;
          if (!sectorId) {
            throw new Response('Missing sector id', { status: 400 });
          }
          const promise = loadSector(sectorId);
          return defer({
            sector: promise.then((data) => data.sector),
            activities: promise.then((data) => data.activities),
          });
        },
        element: suspenseElement(<SectorView />, 'Loading sector data…'),
        errorElement: suspenseElement(<ErrorView title="Sector not found" />, 'Retrieving sector details…'),
      },
      {
        id: 'dataset',
        path: 'sectors/:sectorId/datasets/:datasetId',
        loader: async ({ params }: LoaderFunctionArgs) => {
          const { datasetId } = params;
          if (!datasetId) {
            throw new Response('Missing dataset id', { status: 400 });
          }
          const promise = loadDataset(datasetId);
          return defer({
            dataset: promise.then((data) => data.dataset),
            references: promise.then((data) => data.references),
          });
        },
        element: suspenseElement(<DatasetView />, 'Fetching dataset view…'),
        errorElement: suspenseElement(<ErrorView title="Dataset not available" />, 'Resolving dataset error…'),
      },
    ],
  },
]);
