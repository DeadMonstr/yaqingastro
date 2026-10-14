export function getStoredContent(db) {
  const stored = {}
  for (const { key, value } of db.prepare('SELECT key, value FROM content').all()) {
    stored[key] = JSON.parse(value)
  }
  return stored
}

export function saveContent(db, values) {
  const upsert = db.prepare(`
    INSERT INTO content (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `)
  db.transaction(() => {
    for (const [key, value] of Object.entries(values)) upsert.run({ key, value: JSON.stringify(value) })
  })()
}

export function deleteContent(db, keys) {
  const remove = db.prepare('DELETE FROM content WHERE key = ?')
  db.transaction(() => {
    for (const key of keys) remove.run(key)
  })()
}
