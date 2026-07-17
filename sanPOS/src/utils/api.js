import { getBridge } from './platform'

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:5000';

// In the desktop app every request is delegated to the Electron main process,
// which adds the configured server URL + x-workspace-slug, caches catalog GETs
// in SQLite and queues sales while offline. The web build keeps plain fetch.
async function desktopApiRequest(bridge, path, { method = 'GET', body, token, headers, timeoutMs = 15000 } = {}) {
  const response = await bridge.api.request({ path, method, body, token, headers, timeoutMs });
  if (response.networkError && !response.ok) {
    const message = response.payload?.error || 'You are offline and this action needs a connection.';
    throw new Error(message);
  }
  if (!response.ok) {
    const message =
      response.payload?.error ||
      response.payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return response.payload;
}

export async function apiRequest(path, { method = 'GET', body, token, headers, timeoutMs = 15000 } = {}) {
  const bridge = getBridge();
  if (bridge?.api) {
    return desktopApiRequest(bridge, path, { method, body, token, headers, timeoutMs });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Ensure backend is running on port 5000.');
    }
    throw new Error('Could not reach backend. Ensure backend is running on port 5000.');
  } finally {
    clearTimeout(timeout);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}
