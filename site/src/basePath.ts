export function basePath() {
  // If app is served at /carbon-acx/... return '/carbon-acx', else ''
  const p = window.location.pathname;
  const m = p.match(/^\/carbon-acx(\/|$)/);
  return m ? '/carbon-acx' : '';
}

export const ARTIFACTS = () => `${basePath()}/artifacts`;
export const ASSETS = () => `${basePath()}/assets`;
