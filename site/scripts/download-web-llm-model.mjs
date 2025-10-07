#!/usr/bin/env node
import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const DEFAULT_MODEL_ID = 'qwen2.5-1.5b-instruct-q4f16_1';
const DEFAULT_REPO_ID = 'mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const DEFAULT_ENDPOINT = 'https://huggingface.co';
const MAX_REDIRECTS = 5;

const args = new Set(process.argv.slice(2));
const forceDownload = args.has('--force');
const verbose = args.has('--verbose');
const optional = args.has('--optional');
const skipDownload = (() => {
  const flag = process.env.SKIP_WEBLLM_DOWNLOAD?.trim()?.toLowerCase();
  if (!flag) {
    return false;
  }
  return flag === '1' || flag === 'true' || flag === 'yes';
})();

const modelId = process.env.WEBLLM_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
const repoId = process.env.WEBLLM_REPO_ID?.trim() || DEFAULT_REPO_ID;
const endpoint = (process.env.HF_ENDPOINT?.trim() || DEFAULT_ENDPOINT).replace(/\/$/, '');
const authToken = process.env.HF_TOKEN?.trim() || process.env.HUGGING_FACE_HUB_TOKEN?.trim() || '';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, '..');
const modelsDir = path.join(projectRoot, 'public', 'models');
const targetDir = path.join(modelsDir, modelId);

function createRequestOptions(url) {
  const headers = {
    'User-Agent': 'carbon-acx-webllm-downloader/1.0',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return { headers };
}

async function fetchJson(url, redirectCount = 0) {
  const options = createRequestOptions(url);
  return new Promise((resolve, reject) => {
    const request = https.get(url, options, (response) => {
      const { statusCode = 0, headers } = response;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        response.resume();
        if (redirectCount >= MAX_REDIRECTS) {
          reject(new Error(`Exceeded redirect limit fetching ${url}`));
          return;
        }
        const nextUrl = new URL(headers.location, url).toString();
        fetchJson(nextUrl, redirectCount + 1).then(resolve, reject);
        return;
      }

      if (statusCode !== 200) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`Request failed for ${url} (${statusCode}): ${body}`));
        });
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
  });
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function fileExistsWithSize(filePath, size) {
  try {
    const info = await stat(filePath);
    if (typeof size === 'number' && size > 0) {
      return info.size === size;
    }
    return info.isFile();
  } catch {
    return false;
  }
}

async function downloadFile(url, destination, size, redirectCount = 0) {
  if (!forceDownload && (await fileExistsWithSize(destination, size))) {
    if (verbose) {
      console.log(`[skip] ${path.basename(destination)} already present`);
    }
    return;
  }

  await ensureDir(path.dirname(destination));

  const options = createRequestOptions(url);

  await new Promise((resolve, reject) => {
    const request = https.get(url, options, async (response) => {
      const { statusCode = 0, headers } = response;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        response.resume();
        if (redirectCount >= MAX_REDIRECTS) {
          reject(new Error(`Exceeded redirect limit downloading ${url}`));
          return;
        }
        const nextUrl = new URL(headers.location, url).toString();
        downloadFile(nextUrl, destination, size, redirectCount + 1).then(resolve, reject);
        return;
      }

      if (statusCode !== 200) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`Download failed for ${url} (${statusCode}): ${body}`));
        });
        return;
      }

      const stream = createWriteStream(destination);
      pipeline(response, stream)
        .then(() => {
          if (verbose) {
            console.log(`[downloaded] ${path.basename(destination)}`);
          }
          resolve();
        })
        .catch(reject);
    });

    request.on('error', reject);
  });
}

function filterModelFiles(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.filter((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    if (entry.type === 'directory') {
      return false;
    }
    const name = entry.rfilename || entry.filename;
    if (typeof name !== 'string' || name.length === 0) {
      return false;
    }
    // Skip repository metadata
    if (name.endsWith('.md') || name.endsWith('.txt') || name === '.gitattributes') {
      return false;
    }
    return true;
  });
}

async function main() {
  if (skipDownload) {
    console.log('SKIP_WEBLLM_DOWNLOAD set — skipping model preparation.');
    return;
  }
  console.log(`Preparing local WebLLM model assets for ${modelId}`);
  await ensureDir(targetDir);

  const apiUrl = `${endpoint}/api/models/${repoId}?expand=files`;
  console.log(`Fetching manifest from ${apiUrl}`);

  const metadata = await fetchJson(apiUrl);
  const files = filterModelFiles(metadata?.siblings);

  if (files.length === 0) {
    throw new Error(`No downloadable files detected for ${repoId}`);
  }

  for (const entry of files) {
    const filePath = entry.rfilename || entry.filename;
    const downloadUrl = `${endpoint}/${repoId}/resolve/main/${encodeURI(filePath)}`;
    const destination = path.join(targetDir, filePath);
    const size = typeof entry.size === 'number' ? entry.size : undefined;

    if (verbose) {
      console.log(`→ ${downloadUrl}`);
    }

    await downloadFile(downloadUrl, destination, size);
  }

  console.log(`Model files stored in ${targetDir}`);
  console.log('Done.');
}

main().catch((error) => {
  const message = error?.message || error;
  if (optional) {
    console.warn('[download-web-llm-model] Optional download failed:', message);
    console.warn('Set SKIP_WEBLLM_DOWNLOAD=true to silence this check, or provide HF_TOKEN for private endpoints.');
    return;
  }
  console.error('[download-web-llm-model] Failed to prepare model:', message);
  process.exitCode = 1;
});
