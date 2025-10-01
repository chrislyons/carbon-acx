export interface FetchJSONDiagnostics {
  requestUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  contentType: string | null;
  contentLength: string | null;
  bodySnippet?: string;
}

export class FetchJSONError extends Error {
  public readonly diag: FetchJSONDiagnostics;

  constructor(message: string, diag: FetchJSONDiagnostics) {
    super(message);
    this.name = 'FetchJSONError';
    this.diag = diag;
  }
}

function isDebuggingEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('DEBUG_DATA_LOAD') === '1';
  } catch {
    return false;
  }
}

function logDebug(message: string, diag: FetchJSONDiagnostics): void {
  if (isDebuggingEnabled()) {
    console.debug(message, diag);
  }
}

function resolveContentType(response: Response): string | null {
  const header = response.headers.get('content-type');
  return header ? header.split(';', 1)[0].trim().toLowerCase() : null;
}

function buildDiagnostics(request: Request, response: Response | null, bodySnippet?: string): FetchJSONDiagnostics {
  const contentType = response ? response.headers.get('content-type') : null;
  const contentLength = response ? response.headers.get('content-length') : null;
  return {
    requestUrl: request.url,
    finalUrl: response ? response.url : request.url,
    status: response ? response.status : 0,
    statusText: response ? response.statusText : 'fetch_error',
    contentType,
    contentLength,
    bodySnippet,
  };
}

function snippet(input: string): string {
  return input.length <= 200 ? input : `${input.slice(0, 200)}…`;
}

export async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const request = new Request(input, init);
  let response: Response;

  try {
    response = await fetch(request);
  } catch (error) {
    const diag = buildDiagnostics(request, null, error instanceof Error ? error.message : String(error));
    throw new FetchJSONError(`Request failed for ${request.url}`, diag);
  }

  const diagBase = buildDiagnostics(request, response);
  const contentType = resolveContentType(response);

  const bodyText = await response.text();
  const currentDiag = bodyText ? { ...diagBase, bodySnippet: snippet(bodyText) } : diagBase;

  if (!response.ok) {
    logDebug('fetchJSON error response', currentDiag);
    throw new FetchJSONError(
      `Request failed with status ${response.status} ${response.statusText}`.trim(),
      currentDiag,
    );
  }

  if (contentType !== null && contentType !== 'application/json') {
    logDebug('fetchJSON non-JSON content-type', currentDiag);
    throw new FetchJSONError(
      `Expected application/json but received ${contentType || 'unknown content-type'}`,
      currentDiag,
    );
  }

  try {
    const parsed = JSON.parse(bodyText) as T;
    logDebug('fetchJSON success', diagBase);
    return parsed;
  } catch (error) {
    const parseDiag = { ...currentDiag };
    logDebug('fetchJSON parse failure', parseDiag);
    throw new FetchJSONError(
      error instanceof Error ? `Unable to parse JSON: ${error.message}` : 'Unable to parse JSON payload',
      parseDiag,
    );
  }
}
