import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDb, migrate } from '../src/db/index.js'

test('migrate creates schema on a fresh database', () => {
  const db = openDb(':memory:')
  assert.deepEqual(migrate(db), { from: 0, to: 1 })
  assert.equal(db.pragma('user_version', { simple: true }), 1)
  const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all().map(r => r.name)
  assert.deepEqual(tables, ['categories', 'content', 'dishes', 'sessions', 'users'])
})

test('migrate is idempotent', () => {
  const db = openDb(':memory:')
  migrate(db)
  assert.deepEqual(migrate(db), { from: 1, to: 1 })
})

test('foreign keys are enforced', () => {
  const db = openDb(':memory:')
  migrate(db)
  assert.throws(
    () => db.prepare("insert into dishes (category_id, name_ru, price, sort_order) values (99, 'x', 1, 1)").run(),
    /FOREIGN KEY/
  )
})

test('openDb creates the parent directory of a file database', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-'))
  const db = openDb(path.join(dir, 'nested', 'yaqin.db'))
  migrate(db)
  db.close()
  assert.ok(fs.existsSync(path.join(dir, 'nested', 'yaqin.db')))
})
