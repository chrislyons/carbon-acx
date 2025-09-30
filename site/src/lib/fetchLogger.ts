const ARTIFACT_PATH_PATTERN = /\/artifacts\//;

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return new URL(input, window.location.href).toString();
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function cloneRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Request {
  if (input instanceof Request) {
    return init ? new Request(input, init) : input;
  }
  return new Request(input, init);
}

export function installFetchLogger(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  const globalWindow = window as typeof window & { __acxFetchLogged?: boolean };
  if (globalWindow.__acxFetchLogged) {
    return;
  }
  globalWindow.__acxFetchLogged = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    let request = cloneRequest(input, init);

    const requestUrl = resolveUrl(request);
    const isArtifactRequest = ARTIFACT_PATH_PATTERN.test(
      new URL(requestUrl, window.location.href).pathname
    );

    if (isArtifactRequest) {
      request = new Request(request, {
        method: 'GET',
        cache: 'no-store',
        mode: 'same-origin'
      });
    }

    const method = request.method.toUpperCase();
    const logPrefix = '[fetch]';
    // eslint-disable-next-line no-console
    console.info(`${logPrefix} request`, {
      url: request.url,
      method
    });
    try {
      const response = await originalFetch(request);
      // eslint-disable-next-line no-console
      console.info(`${logPrefix} response`, {
        url: request.url,
        method,
        status: response.status,
        contentType: response.headers.get('content-type')
      });
      return response;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`${logPrefix} error`, {
        url: request.url,
        method,
        error
      });
      throw error;
    }
  };
}
