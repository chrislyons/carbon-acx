import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

import {
  getDataset,
  getSector,
  listActivities,
  listDatasets,
  listProfiles,
  listReferences,
  listSectors,
} from './schema/sample-queries';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function json(res: import('http').ServerResponse, body: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function notFound(res: import('http').ServerResponse) {
  json(res, { error: 'Not found' }, 404);
}

function sampleQueriesApi(): Plugin {
  return {
    name: 'sample-queries-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.method) {
          next();
          return;
        }
        if (req.method !== 'GET') {
          next();
          return;
        }
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/api/sectors') {
          const sectors = await listSectors();
          json(res, { sectors });
          return;
        }
        if (url.pathname === '/api/datasets') {
          const datasets = await listDatasets();
          json(res, { datasets });
          return;
        }
        const sectorMatch = url.pathname.match(/^\/api\/sectors\/([^/]+)$/);
        if (sectorMatch) {
          const [, sectorId] = sectorMatch;
          const [sector, activities, profiles] = await Promise.all([
            getSector(sectorId),
            listActivities(sectorId),
            listProfiles(sectorId),
          ]);
          if (!sector) {
            notFound(res);
            return;
          }
          json(res, { sector, activities, profiles });
          return;
        }
        const datasetMatch = url.pathname.match(/^\/api\/datasets\/([^/]+)$/);
        if (datasetMatch) {
          const [, datasetId] = datasetMatch;
          const [datasetSummary, references] = await Promise.all([
            getDataset(datasetId),
            listReferences(datasetId),
          ]);
          if (!datasetSummary) {
            notFound(res);
            return;
          }
          const dataset = {
            ...datasetSummary,
            title: datasetSummary.datasetId,
            description:
              'Synthetic validator bundle used for the Carbon ACX preview environment.',
            figures: [
              {
                id: 'FIG.SECTOR_COVERAGE_OVERVIEW',
                title: 'Sector coverage overview',
                description: 'Abatement potential versus cost across the sample sectors.',
                figure_type: 'bubble',
                data: {
                  id: 'sector-coverage-bubble',
                  title: 'Estimated abatement potential',
                  subtitle: 'Illustrative portfolio only',
                  description:
                    'Each bubble represents a sector scenario; size reflects indicative capital investment (USD millions).',
                  xAxis: { label: 'Abatement cost', unit: 'USD/tCO₂e' },
                  yAxis: { label: 'Abatement potential', unit: 'MtCO₂e' },
                  valueAxis: { label: 'Capital investment', unit: 'USD millions' },
                  points: [
                    { id: 'power', label: 'Power', x: 25, y: 310, value: 420, description: 'Grid decarbonisation package.' },
                    { id: 'transport', label: 'Transport', x: 48, y: 180, value: 260, description: 'Fleet electrification mix.' },
                    { id: 'industry', label: 'Industry', x: 62, y: 220, value: 310, description: 'Heat recovery retrofits.' },
                    { id: 'buildings', label: 'Buildings', x: 18, y: 140, value: 150, description: 'Envelope upgrades and smart controls.' },
                    { id: 'agriculture', label: 'Agriculture', x: 32, y: 90, value: 120, description: 'Regenerative practices pilots.' },
                  ],
                },
              },
            ],
          };
          json(res, { dataset, references });
          return;
        }
        if (url.pathname.startsWith('/references/')) {
          try {
            const repoRoot = path.resolve(__dirname, '..', '..');
            const referencesRoot = path.resolve(repoRoot, 'dist', 'references');
            const relativePath = url.pathname.replace(/^\/references\/?/, '');
            const filePath = path.resolve(referencesRoot, relativePath);
            if (
              !filePath.startsWith(referencesRoot + path.sep)
            ) {
              notFound(res);
              return;
            }
            const file = await readFile(filePath);
            res.statusCode = 200;
            res.end(file);
            return;
          } catch {
            notFound(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    sampleQueriesApi(),
    compression({ threshold: 1024, algorithm: 'gzip' }),
    compression({ threshold: 1024, algorithm: 'brotliCompress', ext: '.br' }),
  ],
  envPrefix: ['VITE_', 'ACX_'],
  server: {
    port: 5173,
  },
});
