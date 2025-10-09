import type { LoaderFunctionArgs } from 'react-router-dom';
import { createBrowserRouter, defer } from 'react-router-dom';

import Layout from './views/Layout';
import HomeView from './views/HomeView';
import SectorView from './views/SectorView';
import DatasetView from './views/DatasetView';
import { loadDataset, loadSector, loadSectors } from './lib/api';
import ErrorView from './views/ErrorView';

export const router = createBrowserRouter([
  {
    id: 'layout',
    path: '/',
    element: <Layout />, 
    loader: async () => {
      return defer({
        sectors: loadSectors(),
      });
    },
    errorElement: <ErrorView title="Navigation error" />,
    children: [
      {
        index: true,
        element: <HomeView />,
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
        element: <SectorView />,
        errorElement: <ErrorView title="Sector not found" />, 
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
        element: <DatasetView />,
        errorElement: <ErrorView title="Dataset not available" />, 
      },
    ],
  },
]);
