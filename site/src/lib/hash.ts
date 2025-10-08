export function hashManifest(payload: unknown): string {
  const serialised = JSON.stringify(payload ?? {});
  let hash = 2166136261;
  for (let index = 0; index < serialised.length; index += 1) {
    hash ^= serialised.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
