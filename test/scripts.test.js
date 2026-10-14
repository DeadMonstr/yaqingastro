import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { openDb, migrate } from '../src/db/index.js'
import { seedMenu } from '../src/db/seed.js'
import { createUser } from '../src/repos/users.js'
import { createSession, findSessionUser } from '../src/repos/sessions.js'
import { hashPassword, verifyPassword } from '../src/services/auth.js'
import { backupDatabase } from '../scripts/backup.js'
import { setPassword } from '../scripts/set-password.js'

test('backupDatabase writes a readable copy', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-bk-'))
  const file = path.join(dir, 'yaqin.db')
  const db = openDb(file); migrate(db); seedMenu(db); db.close()
  const out = await backupDatabase(file, path.join(dir, 'backups'), new Date('2026-10-14T09:05:00'))
  assert.equal(path.basename(out), 'yaqin-2026-10-14-0905.db')
  assert.equal(new Database(out, { readonly: true }).prepare('select count(*) n from dishes').get().n, 24)
})

test('setPassword changes the hash and ends sessions', async () => {
  const db = openDb(':memory:'); migrate(db)
  const u = createUser(db, 'admin', await hashPassword('old-pass-123'))
  const s = createSession(db, u.id)
  assert.equal(await setPassword(db, 'admin', 'short'), 'too_short')
  assert.equal(await setPassword(db, 'ghost', 'new-pass-123'), 'not_found')
  assert.equal(await setPassword(db, 'admin', 'new-pass-123'), 'ok')
  assert.equal(findSessionUser(db, s.id), undefined)
  const row = db.prepare('select password_hash from users where id = ?').get(u.id)
  assert.equal(await verifyPassword('new-pass-123', row.password_hash), true)
})
