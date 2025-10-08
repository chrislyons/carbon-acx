#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { build, preview } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');
const assetsDir = join(distDir, 'assets');
const baselinePath = join(__dirname, 'perf-baseline.json');
const BUNDLE_BUDGET_BYTES = 250 * 1024;
const ROUTES = ['/', '/story', '/onboarding'];

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

async function ensureDist() {
  try {
    await access(assetsDir);
  } catch {
    await build();
  }
}

async function collectBundleStats() {
  const files = await readdir(assetsDir);
  const bundleFiles = files.filter((file) => file.endsWith('.js') || file.endsWith('.css'));
  if (bundleFiles.length === 0) {
    throw new Error('No bundle assets found after build.');
  }

  const stats = await Promise.all(
    bundleFiles.map(async (file) => {
      const content = await readFile(join(assetsDir, file));
      const gzipBytes = gzipSync(content).length;
      return {
        file,
        bytes: content.length,
        gzipBytes
      };
    })
  );

  const largest = stats.reduce((max, entry) => Math.max(max, entry.gzipBytes), 0);
  const total = stats.reduce((sum, entry) => sum + entry.gzipBytes, 0);

  return { stats, largest, total };
}

async function loadBaseline() {
  const raw = await readFile(baselinePath, 'utf8');
  return JSON.parse(raw);
}

async function runLighthouse(route, baseUrl) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
  });

  try {
    const result = await lighthouse(
      new URL(route, baseUrl).toString(),
      {
        port: chrome.port,
        output: 'json',
        logLevel: 'error'
      },
      {
        extends: 'lighthouse:default'
      }
    );

    if (!result || !result.lhr) {
      throw new Error(`Failed to obtain Lighthouse results for route ${route}`);
    }

    console.log(`[perf-check] lighthouse:${route}`, JSON.stringify(result.lhr, null, 2));

    const lcpAudit = result.lhr.audits['largest-contentful-paint'];
    const clsAudit = result.lhr.audits['cumulative-layout-shift'];

    const lcpSeconds = (lcpAudit?.numericValue ?? 0) / 1000;
    const clsScore = clsAudit?.numericValue ?? 0;

    if (lcpSeconds > 2.5) {
      throw new Error(`LCP budget exceeded on ${route}: ${lcpSeconds.toFixed(2)}s`);
    }

    if (clsScore > 0.1) {
      throw new Error(`CLS budget exceeded on ${route}: ${clsScore.toFixed(3)}`);
    }

    return {
      route,
      lcpSeconds,
      clsScore,
      performanceScore: result.lhr.categories?.performance?.score ?? null
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  await ensureDist();
  const baseline = await loadBaseline();

  const { stats, largest, total } = await collectBundleStats();

  if (largest > BUNDLE_BUDGET_BYTES) {
    throw new Error(`Largest asset ${formatBytes(largest)} exceeds budget of ${formatBytes(BUNDLE_BUDGET_BYTES)}.`);
  }

  if (largest > baseline.bundle.largestGzipBytes * 1.05) {
    throw new Error(
      `Largest asset regression beyond 5%: ${formatBytes(largest)} vs baseline ${formatBytes(baseline.bundle.largestGzipBytes)}.`
    );
  }

  if (total > baseline.bundle.totalGzipBytes * 1.05) {
    throw new Error(
      `Total asset regression beyond 5%: ${formatBytes(total)} vs baseline ${formatBytes(baseline.bundle.totalGzipBytes)}.`
    );
  }

  console.log('[perf-check] bundle-stats', JSON.stringify({ stats, largest, total }, null, 2));

  const previewServer = await preview({
    preview: {
      port: 4173,
      host: '127.0.0.1'
    }
  });

  const baseUrl = previewServer.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:4173/';

  try {
    const routeResults = [];
    for (const route of ROUTES) {
      routeResults.push(await runLighthouse(route, baseUrl));
    }
    console.log('[perf-check] route-summary', JSON.stringify(routeResults, null, 2));
  } finally {
    await previewServer.close();
  }
}

main().catch((error) => {
  console.error('[perf-check] failure', error);
  process.exitCode = 1;
});
