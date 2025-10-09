import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

import {
  getDataset,
  getSector,
  listActivities,
  listDatasets,
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
          const [sector, activities] = await Promise.all([
            getSector(sectorId),
            listActivities(sectorId),
          ]);
          if (!sector) {
            notFound(res);
            return;
          }
          json(res, { sector, activities });
          return;
        }
        const datasetMatch = url.pathname.match(/^\/api\/datasets\/([^/]+)$/);
        if (datasetMatch) {
          const [, datasetId] = datasetMatch;
          const [dataset, references] = await Promise.all([
            getDataset(datasetId),
            listReferences(datasetId),
          ]);
          if (!dataset) {
            notFound(res);
            return;
          }
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
              !filePath.startsWith(referencesRoot + path.sep) &&
              filePath !== referencesRoot
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
  plugins: [react(), sampleQueriesApi()],
  server: {
    port: 5173,
  },
});
