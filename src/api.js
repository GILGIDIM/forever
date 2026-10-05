// Thin fetch wrapper. Errors carry the server's message and any details list.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status}).`, data?.details);
  return data;
}

export const api = {
  me: () => request('GET', '/api/me'),
  logout: () => request('POST', '/api/auth/logout'),
  myPools: () => request('GET', '/api/pools'),
  createPool: (region, ruleset) => request('POST', '/api/pools', { region, ruleset }),
  pool: (id) => request('GET', `/api/pools/${id}`),
  savePool: (id, characters) => request('PUT', `/api/pools/${id}`, { characters }),
  setVisibility: (id, isPublic) => request('PATCH', `/api/pools/${id}`, { isPublic }),
  deletePool: (id) => request('DELETE', `/api/pools/${id}`),
  userPools: (handle) => request('GET', `/api/users/${encodeURIComponent(handle)}`),
  importable: (poolId) => request('GET', `/api/import?poolId=${poolId}`),
  sync: (poolId) => request('POST', '/api/sync', { poolId }),
};
