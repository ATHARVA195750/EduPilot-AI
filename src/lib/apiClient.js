/**
 * Centralized API client for EduPilot FastAPI backend.
 * Reads base URL from VITE_API_BASE_URL environment variable.
 * Attaches JWT token from sessionStorage on every authenticated request.
 * Never logs or exposes tokens in plain text.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

/** Canonical API base URL — single source of truth re-exported for the few
 *  call sites that need a raw fetch (e.g. multipart uploads). */
export const API_BASE_URL = API_BASE;

const TOKEN_KEY = 'edupilot_token';

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

async function handleResponse(response) {
  if (response.ok) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  let errorMessage = `HTTP ${response.status}`;
  try {
    const err = await response.json();
    const detail = err?.detail ?? err?.message;
    if (typeof detail === 'string' && detail.trim()) {
      errorMessage = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI 422 validation errors are arrays of objects — stringify them
      // properly instead of letting `new Error([...])` produce "[object Object]".
      const parts = detail
        .map((d) => {
          if (typeof d === 'string') return d;
          if (d?.msg) {
            const loc = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
            return loc ? `${d.msg} (${loc})` : d.msg;
          }
          return d ? JSON.stringify(d) : '';
        })
        .filter(Boolean);
      if (parts.length) errorMessage = parts.join('; ');
    } else if (detail && typeof detail === 'object') {
      errorMessage = JSON.stringify(detail);
    }
  } catch {
    // body not JSON
  }

  if (response.status === 401) {
    tokenStore.clear();
    // Broadcast logout to app
    window.dispatchEvent(new CustomEvent('edupilot:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }

  throw new Error(errorMessage);
}

function buildHeaders(authenticated = true, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (authenticated) {
    const token = tokenStore.get();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

function isNetworkFailure(err) {
  // fetch() rejects with TypeError when the server is unreachable/refuses
  // the connection — this is a NETWORK failure, never an auth failure.
  return err instanceof TypeError && /fetch|network|load failed/i.test(err.message);
}

function networkError(path) {
  return new Error(
    `EduPilot API is unavailable at ${API_BASE}${path}. ` +
    `Start the backend (START_EDUPILOT.bat) and retry.`
  );
}

export async function apiGet(path, params = {}, authenticated = true) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, v);
    }
  });
  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(authenticated),
    });
  } catch (err) {
    if (isNetworkFailure(err)) throw networkError(path);
    throw err;
  }
  return handleResponse(response);
}

export async function apiPost(path, body = {}, authenticated = true) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders(authenticated),
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (isNetworkFailure(err)) throw networkError(path);
    throw err;
  }
  return handleResponse(response);
}

export async function apiPut(path, body = {}, authenticated = true) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: buildHeaders(authenticated),
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (isNetworkFailure(err)) throw networkError(path);
    throw err;
  }
  return handleResponse(response);
}

export async function apiPatch(path, body = {}, authenticated = true) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(authenticated),
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (isNetworkFailure(err)) throw networkError(path);
    throw err;
  }
  return handleResponse(response);
}

export async function apiDelete(path, authenticated = true) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(authenticated),
    });
  } catch (err) {
    if (isNetworkFailure(err)) throw networkError(path);
    throw err;
  }
  return handleResponse(response);
}
