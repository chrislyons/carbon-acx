export const base = import.meta.env.BASE_URL || '/';
export const artifactsBase = `${base}artifacts/`;
export const artifactUrl = (name: string) => `${artifactsBase}${name}`;
