import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { loadConfig } from '../src/config.js'

test('loadConfig fills defaults', () => {
  const c = loadConfig({})
  assert.equal(c.env, 'development')
  assert.equal(c.isProd, false)
  assert.equal(c.host, '0.0.0.0')
  assert.equal(c.port, 3000)
  assert.equal(c.publicUrl, 'http://localhost:3000')
  assert.equal(c.dbFile, path.resolve('data/yaqin.db'))
  assert.equal(c.uploadsDir, path.resolve('data/uploads'))
  assert.equal(c.backupsDir, path.resolve('data/backups'))
  assert.equal(c.trustProxy, false)
  assert.equal(c.adminLogin, null)
  assert.ok(c.sessionSecret.length >= 32)
})

test('loadConfig requires SESSION_SECRET in production', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /SESSION_SECRET/)
})

test('loadConfig strips trailing slash from PUBLIC_URL and reads TRUST_PROXY', () => {
  const c = loadConfig({ PUBLIC_URL: 'https://yaqin.uz/', TRUST_PROXY: 'true', DATA_DIR: '/srv/data' })
  assert.equal(c.publicUrl, 'https://yaqin.uz')
  assert.equal(c.trustProxy, true)
  assert.equal(c.dbFile, '/srv/data/yaqin.db')
})
