export type ComputeRequest = Record<string, unknown>;

export type ComputeOptions = Omit<RequestInit, 'method' | 'body'>;

export async function compute<TResponse = unknown>(
  payload: ComputeRequest,
  options: ComputeOptions = {}
): Promise<TResponse> {
  const { headers, ...fetchOptions } = options;
  const response = await fetch('/api/compute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {})
    },
    body: JSON.stringify(payload),
    ...fetchOptions
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
