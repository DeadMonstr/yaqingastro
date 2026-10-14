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
import { buildStatic, rebase } from '../scripts/build-static.js'

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

test('rebase prefixes root links, srcset entries and CSS urls but not external ones', () => {
  const html = '<a href="/ru/menu"><img src="/uploads/a-800.webp" srcset="/uploads/a-800.webp 800w, /uploads/a-1400.webp 1400w">'
    + '<a href="https://x.uz/ru"><a href="//cdn.x/y"><a href="#about">'
  assert.equal(rebase(html, '/repo'),
    '<a href="/repo/ru/menu"><img src="/repo/uploads/a-800.webp" srcset="/repo/uploads/a-800.webp 800w, /repo/uploads/a-1400.webp 1400w">'
    + '<a href="https://x.uz/ru"><a href="//cdn.x/y"><a href="#about">')
  assert.equal(rebase("src: url('/static/f.woff2')", '/repo'), "src: url('/repo/static/f.woff2')")
})

test('buildStatic writes every page with its assets under the Pages base path', async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-dist-'))
  const files = await buildStatic({ outDir, publicUrl: 'https://user.github.io/repo/' })
  for (const file of ['index.html', 'menu/index.html', '404.html', '.nojekyll', 'ru/index.html', 'uz/menu/index.html',
    'en/menu/index.html', 'static/css/site.css', 'static/js/menu.js', 'static/fonts/manrope-latin-wght-normal.woff2']) {
    assert.ok(files.includes(file), file)
  }

  const home = fs.readFileSync(path.join(outDir, 'ru/index.html'), 'utf8')
  assert.match(home, /<meta name="robots" content="noindex">/)
  assert.match(home, /href="\/repo\/static\/css\/site\.css\?v=/)
  assert.match(home, /hreflang="uz" href="https:\/\/user\.github\.io\/repo\/uz"/)
  assert.doesNotMatch(home, /(href|src)="\/(?!repo\/)/)
  assert.match(fs.readFileSync(path.join(outDir, 'static/css/fonts.css'), 'utf8'), /url\('\/repo\/static\/fonts\//)
  assert.match(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), /url=\/repo\/ru\//)
  assert.match(fs.readFileSync(path.join(outDir, '404.html'), 'utf8'), /href="\/repo\/ru"/)
  fs.rmSync(outDir, { recursive: true, force: true })
})

test('buildStatic refuses to wipe the project folder', async () => {
  await assert.rejects(buildStatic({ outDir: path.join(import.meta.dirname, '..'), publicUrl: 'https://u.github.io/r' }), /содержит проект/)
})
