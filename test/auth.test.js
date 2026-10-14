import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb, migrate } from '../src/db/index.js'
import { hashPassword, verifyPassword, ensureAdmin } from '../src/services/auth.js'
import { createUser, countUsers, findUserByLogin, getUser, setPasswordHash } from '../src/repos/users.js'
import * as S from '../src/repos/sessions.js'

const fresh = () => { const db = openDb(':memory:'); migrate(db); return db }
const day = 24 * 60 * 60 * 1000
const silent = { warn() {}, info() {} }

test('hashPassword and verifyPassword round-trip', async () => {
  const h1 = await hashPassword('secret-pass-1'), h2 = await hashPassword('secret-pass-1')
  assert.match(h1, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
  assert.notEqual(h1, h2)
  assert.equal(await verifyPassword('secret-pass-1', h1), true)
  assert.equal(await verifyPassword('wrong', h1), false)
  assert.equal(await verifyPassword('x', 'garbage'), false)
})

test('sessions expire after 30 days', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h'), t0 = new Date('2026-01-01T00:00:00Z')
  const s = S.createSession(db, u.id, t0)
  assert.equal(S.findSessionUser(db, s.id, new Date(t0.getTime() + 29 * day)).login, 'admin')
  assert.equal(S.findSessionUser(db, s.id, new Date(t0.getTime() + 31 * day)), undefined)
  assert.equal(S.deleteExpiredSessions(db, new Date(t0.getTime() + 31 * day)), 1)
})

test('deleteOtherSessions keeps the current one', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h')
  const a = S.createSession(db, u.id), b = S.createSession(db, u.id)
  S.deleteOtherSessions(db, u.id, a.id)
  assert.ok(S.findSessionUser(db, a.id))
  assert.equal(S.findSessionUser(db, b.id), undefined)
})

test('ensureAdmin creates the first admin only once', async () => {
  const db = fresh()
  assert.equal(await ensureAdmin(db, { adminLogin: null, adminPassword: null }, silent), 'missing')
  assert.equal(await ensureAdmin(db, { adminLogin: 'admin', adminPassword: 'secret-pass-1' }, silent), 'created')
  assert.equal(await ensureAdmin(db, { adminLogin: 'other', adminPassword: 'x' }, silent), 'exists')
  assert.equal(countUsers(db), 1)
  assert.equal(await verifyPassword('secret-pass-1', findUserByLogin(db, 'admin').password_hash), true)
})

test('verifyPassword rejects malformed stored values', async () => {
  const good = await hashPassword('secret-pass-1')
  const [, salt, hash] = good.split('$')
  for (const bad of ['', `scrypt$${salt}`, `scrypt$${salt}$${hash.slice(2)}`, `bcrypt$${salt}$${hash}`, `scrypt$${salt}$${hash.toUpperCase()}`, null, undefined]) {
    assert.equal(await verifyPassword('secret-pass-1', bad), false)
  }
  assert.equal(await verifyPassword(undefined, good), false)
})

test('createSession returns a random 64-hex id and a 30-day ISO expiry', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h'), t0 = new Date('2026-01-01T00:00:00Z')
  const a = S.createSession(db, u.id, t0), b = S.createSession(db, u.id, t0)
  assert.match(a.id, /^[0-9a-f]{64}$/)
  assert.notEqual(a.id, b.id)
  assert.equal(a.expires_at, new Date(t0.getTime() + 30 * day).toISOString())
})

test('a session is not valid at its exact expiry time', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h'), t0 = new Date('2026-01-01T00:00:00Z')
  const s = S.createSession(db, u.id, t0)
  assert.equal(S.findSessionUser(db, s.id, new Date(s.expires_at)), undefined)
})

test('findSessionUser tolerates a missing or unknown id', () => {
  const db = fresh()
  assert.equal(S.findSessionUser(db, undefined), undefined)
  assert.equal(S.findSessionUser(db, false), undefined)
  assert.equal(S.findSessionUser(db, 'nope'), undefined)
})

test('deleteSession and deleteAllSessions remove only what they should', () => {
  const db = fresh(), u1 = createUser(db, 'admin', 'h'), u2 = createUser(db, 'other', 'h')
  const a = S.createSession(db, u1.id), b = S.createSession(db, u1.id), c = S.createSession(db, u2.id)
  S.deleteSession(db, a.id)
  assert.equal(S.findSessionUser(db, a.id), undefined)
  assert.ok(S.findSessionUser(db, b.id))
  S.deleteAllSessions(db, u1.id)
  assert.equal(S.findSessionUser(db, b.id), undefined)
  assert.ok(S.findSessionUser(db, c.id))
})

test('users repo: lookup, duplicate login and password change', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h1')
  assert.deepEqual(Object.keys(u).sort(), ['created_at', 'id', 'login', 'password_hash'])
  assert.equal(getUser(db, u.id).login, 'admin')
  assert.equal(findUserByLogin(db, 'nobody'), undefined)
  assert.throws(() => createUser(db, 'admin', 'h2'))
  setPasswordHash(db, u.id, 'h3')
  assert.equal(getUser(db, u.id).password_hash, 'h3')
})
