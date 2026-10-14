import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations')

export function openDb(file) {
  const inMemory = file === ':memory:'
  if (!inMemory) fs.mkdirSync(path.dirname(file), { recursive: true })

  const db = new Database(file)
  if (!inMemory) db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  return db
}

function listMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .map(name => ({ name, match: /^(\d+)_.+\.sql$/.exec(name) }))
    .filter(({ match }) => match)
    .map(({ name, match }) => ({ version: Number(match[1]), file: path.join(MIGRATIONS_DIR, name) }))
    .sort((a, b) => a.version - b.version)
}

export function migrate(db) {
  const from = db.pragma('user_version', { simple: true })
  let to = from

  for (const { version, file } of listMigrations()) {
    if (version <= from) continue
    const sql = fs.readFileSync(file, 'utf8')
    db.transaction(() => {
      db.exec(sql)
      db.pragma(`user_version = ${version}`)
    })()
    to = version
  }

  return { from, to }
}
