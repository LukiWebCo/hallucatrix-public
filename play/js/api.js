// API client: bearer tokens only (no cookies), JSON in and out. The base URL lives only in config.js.
import { roomToken } from './tables.js?v=1bb003a1a4fc';

export class ApiErr extends Error {
  constructor(status, key, code, vars) { super(code || key); this.status = status; this.key = key; this.code = code; this.vars = vars || null; }
}

function base() {
  return ((window.HXG && window.HXG.apiBase) || '').replace(/\/+$/, '');
}

export async function api(method, path, body, opts = {}) {
  const headers = {};
  const roomId = path.match(/\/api\/games\/rooms\/(\d+)/)?.[1];
  const tok = roomId && opts.auth !== false ? (opts.token || roomToken(roomId)) : null;
  if (tok) headers.Authorization = 'Bearer ' + tok;
  let data;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    data = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(base() + path, { method, headers, body: data, mode: 'cors', credentials: 'omit', cache: 'no-store', signal: opts.signal, referrerPolicy: 'no-referrer' });
  } catch {
    throw new ApiErr(0, 'games.errors.server', 'offline');
  }
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const key = (json && json.error && json.error.key) || 'games.errors.server';
    const code = json && json.error && json.error.code;
    const vars = json && json.error && json.error.vars;
    throw new ApiErr(res.status, key, code, vars);
  }
  return json;
}

export const get = (p, o) => api('GET', p, undefined, o);
export const post = (p, b, o) => api('POST', p, b === undefined ? {} : b, o);
export const patch = (p, b, o) => api('PATCH', p, b, o);
export const del = (p, o) => api('DELETE', p, undefined, o);
