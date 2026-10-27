const migrated = new Set();

export function migrateStorageKey(kind, oldKey, newKey, fallback = null) {
  try {
    const storage = kind === 'session' ? sessionStorage : localStorage;
    const migrationId = `${kind}:${oldKey}`;
    const current = storage.getItem(newKey);
    if (migrated.has(migrationId)) return current;
    const legacy = storage.getItem(oldKey);
    if (legacy !== null) {
      if (current === null) storage.setItem(newKey, legacy);
      storage.removeItem(oldKey);
    }
    migrated.add(migrationId);
    return current ?? legacy;
  } catch {
    return fallback;
  }
}
