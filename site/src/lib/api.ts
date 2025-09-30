export type ComputeRequest = Record<string, unknown>;

export async function compute<TResponse = unknown>(payload: ComputeRequest): Promise<TResponse> {
  const response = await fetch('/api/compute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
