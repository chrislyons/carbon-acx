import { base } from './lib/paths';

function normaliseBasePath(path: string): string {
  if (!path) {
    return '';
  }
  let resolved = path;
  if (!resolved.startsWith('/')) {
    resolved = `/${resolved}`;
  }
  if (resolved !== '/' && resolved.endsWith('/')) {
    resolved = resolved.slice(0, -1);
  }
  return resolved === '/' ? '' : resolved;
}

export function basePath(): string {
  return normaliseBasePath(base);
}

export const ARTIFACTS = () => `${basePath()}/artifacts`;
export const ASSETS = () => `${basePath()}/assets`;
