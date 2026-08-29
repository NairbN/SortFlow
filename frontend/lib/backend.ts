const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? "";

/**
 * fetch() wrapper for every call to the FastAPI backend - attaches the
 * shared API key header so the backend's own auth (see backend/app/auth.py)
 * accepts the request. Only ever called from server-side code (Server
 * Components / Server Functions), so this key never reaches the browser.
 */
export function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      "X-API-Key": BACKEND_API_KEY,
    },
  });
}
