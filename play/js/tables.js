const KEY = 'hxg.games.tables';
const LEGACY_KEY = 'eai.games.tables';
let migrated = false;
let memoryRows = [];

function read() {
  try {
    if (!migrated) {
      migrated = true;
      const current = localStorage.getItem(KEY);
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (!current && legacy) {
        const rows = JSON.parse(legacy);
        if (Array.isArray(rows)) localStorage.setItem(KEY, JSON.stringify(rows));
      }
      if (legacy) localStorage.removeItem(LEGACY_KEY);
    }
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]');
    const stored = Array.isArray(rows) ? rows.filter(valid) : [];
    const merged = [...stored];
    for (const row of memoryRows) if (!merged.some((item) => String(item.room_id) === String(row.room_id))) merged.push(row);
    return merged;
  } catch {
    return memoryRows.slice();
  }
}

function valid(row) {
  return row && Number.isSafeInteger(Number(row.room_id)) && typeof row.token === 'string'
    && typeof row.code === 'string' && ['dots', 'conquian'].includes(row.game);
}

function write(rows) {
  memoryRows = rows.slice();
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

function prune(rows, now = Date.now()) {
  return rows.filter((row) => row.status !== 'finished'
    || now - (row.finished_at || row.saved_at || now) < 24 * 60 * 60 * 1000);
}

export function tables() {
  const rows = prune(read());
  write(rows);
  return rows.sort((a, b) => (b.saved_at || 0) - (a.saved_at || 0));
}

export function table(roomId) {
  return tables().find((row) => String(row.room_id) === String(roomId)) || null;
}

export function roomToken(roomId) {
  const row = table(roomId);
  if (row) return row.token;
  try {
    return localStorage.getItem('hxg.room.' + roomId) || null;
  } catch {
    return null;
  }
}

export function saveTable(row) {
  if (!valid(row)) return false;
  const rows = read().filter((item) => String(item.room_id) !== String(row.room_id));
  rows.push({ ...row, room_id: Number(row.room_id), saved_at: row.saved_at || Date.now() });
  write(prune(rows));
  return true;
}

export function updateTable(roomId, changes) {
  const rows = read();
  const found = rows.find((row) => String(row.room_id) === String(roomId));
  if (!found) return false;
  Object.assign(found, changes);
  if (changes.status === 'finished' && !found.finished_at) found.finished_at = Date.now();
  return write(prune(rows));
}

export function removeTable(roomId) {
  const rows = read().filter((row) => String(row.room_id) !== String(roomId));
  let ok = write(rows);
  try {
    localStorage.removeItem('hxg.room.' + roomId);
  } catch {
    ok = false;
  }
  return ok;
}
