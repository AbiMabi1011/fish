/** Same-origin HTTP boundary for the independent Node backend. */
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  let response:Response;
  try { response = await fetch('/api' + path, { credentials: 'same-origin',
    ...(data !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) }); } catch { throw new Error('Game server is offline. Open START-GAME.cmd in the treasure-count folder, then refresh this page.'); }
  let result;
  try { result = await response.json(); } catch { throw new Error('The local server could not be reached. Start the game with npm run dev.'); }
  if (!response.ok) throw new Error(result.error || 'Request failed. Please retry.');
  return result;
}
