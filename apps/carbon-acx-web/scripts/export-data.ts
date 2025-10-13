#!/usr/bin/env node
/**
 * Export CSV data as static JSON files for production builds
 *
 * This script reads CSV files from the data directory and exports them
 * as JSON files that can be served statically by Cloudflare Pages.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getDataset,
  listActivities,
  listActivitySchedule,
  listDatasets,
  listEmissionFactors,
  listProfiles,
  listReferences,
  listSectors,
} from '../schema/sample-queries';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const apiDir = path.join(publicDir, 'api');

async function ensureDirectory(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Exported ${path.relative(publicDir, filePath)}`);
}

async function exportData() {
  console.log('Exporting CSV data as static JSON...\n');

  await ensureDirectory(apiDir);
  await ensureDirectory(path.join(apiDir, 'sectors'));
  await ensureDirectory(path.join(apiDir, 'datasets'));
  await ensureDirectory(path.join(apiDir, 'profiles'));

  // Export sectors list
  const sectors = await listSectors();
  await writeJson(path.join(apiDir, 'sectors.json'), { sectors });

  // Export sector details (activities + profiles)
  const allProfiles = [];
  for (const sector of sectors) {
    const [activities, profiles] = await Promise.all([
      listActivities(sector.id),
      listProfiles(sector.id),
    ]);
    await writeJson(path.join(apiDir, 'sectors', `${encodeURIComponent(sector.id)}.json`), {
      sector,
      activities,
      profiles,
    });
    allProfiles.push(...profiles);
  }

  // Export profile activity schedules
  for (const profile of allProfiles) {
    const schedule = await listActivitySchedule(profile.id);
    await writeJson(path.join(apiDir, 'profiles', `${encodeURIComponent(profile.id)}.json`), {
      profile,
      activities: schedule,
    });
  }

  // Export emission factors
  const emissionFactors = await listEmissionFactors();
  await writeJson(path.join(apiDir, 'emission-factors.json'), { emissionFactors });

  // Export datasets list
  const datasets = await listDatasets();
  await writeJson(path.join(apiDir, 'datasets.json'), { datasets });

  // Export dataset details (figures + references)
  for (const dataset of datasets) {
    const [datasetDetail, references] = await Promise.all([
      getDataset(dataset.datasetId),
      listReferences(dataset.datasetId),
    ]);

    // Include synthetic figure data (from vite.config.ts logic)
    const enrichedDataset = {
      ...datasetDetail,
      title: datasetDetail?.datasetId ?? 'Unknown',
      description: 'Synthetic validator bundle used for the Carbon ACX preview environment.',
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

    await writeJson(path.join(apiDir, 'datasets', `${encodeURIComponent(dataset.datasetId)}.json`), {
      dataset: enrichedDataset,
      references,
    });
  }

  console.log('\n✅ Data export complete!');
  console.log(`   Files written to: ${path.relative(process.cwd(), apiDir)}`);
}

exportData().catch((error) => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
