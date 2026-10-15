// API client: bearer tokens only (no cookies), JSON in and out. The base URL lives only in config.js.
const TOKEN_KEY = 'hxg.session';
let memoryToken = null;
let onSignedOut = () => {};

export class ApiErr extends Error {
  constructor(status, key, code, vars) { super(code || key); this.status = status; this.key = key; this.code = code; this.vars = vars || null; }
}

export function setSignedOutHandler(fn) { onSignedOut = fn; }

export function getToken(path = "") {
  const id = path.match(/\/rooms\/(\d+)/)?.[1];
  if (id) { try { const scoped = localStorage.getItem('hxg.room.' + id); if (scoped) return scoped; } catch {} }
  try { return localStorage.getItem(TOKEN_KEY) || memoryToken; } catch { return memoryToken; }
}

export function setToken(tok) {
  memoryToken = tok;
  try {
    if (tok) localStorage.setItem(TOKEN_KEY, tok);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode: the session lasts this tab only */ }
}

function base() {
  return ((window.HXG && window.HXG.apiBase) || '').replace(/\/+$/, '');
}

export async function api(method, path, body, opts = {}) {
  const headers = {};
  const roomId = path.match(/\/rooms\/(\d+)/)?.[1];
  let scoped = false;
  try { scoped = !!roomId && !!localStorage.getItem('hxg.room.' + roomId); } catch {}
  const tok = opts.token || (opts.auth === false ? null : getToken(path));
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
    if ([401, 403].includes(res.status) && roomId) { try { localStorage.removeItem('hxg.room.' + roomId); } catch {} }
    if (res.status === 401 && !scoped && tok && !opts.token && code === 'unauthorized') {
      setToken(null);
      onSignedOut();
    }
    throw new ApiErr(res.status, key, code, vars);
  }
  return json;
}

export const get = (p, o) => api('GET', p, undefined, o);
export const post = (p, b, o) => api('POST', p, b === undefined ? {} : b, o);
export const patch = (p, b, o) => api('PATCH', p, b, o);
export const del = (p, o) => api('DELETE', p, undefined, o);
