/** Same-origin HTTP boundary for the game backend. */
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      credentials: 'same-origin',
      ...(data !== undefined
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        : {}),
    });
  } catch {
    throw new Error('The game server could not be reached. Check your connection and try again.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (response.status === 404 || contentType.includes('text/html')) {
      throw new Error('The game API is missing from this deployment. The site owner needs to connect the backend to /api.');
    }
    throw new Error('The game server returned an unexpected response. Please try again.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The game server returned an invalid response. Please try again.');
  }
  if (!response.ok) throw new Error(result.error || 'Request failed. Please retry.');
  return result;
}
