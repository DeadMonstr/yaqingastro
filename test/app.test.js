import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { makeApp, testConfig } from './helpers/app.js'
import { multipart } from './helpers/admin.js'
import { buildApp } from '../src/app.js'

const app = async (t, o) => { const a = await makeApp(o); t.after(() => a.close()); return a }

test('GET / redirects to /ru by default', async t => {
  const r = await (await app(t)).inject('/')
  assert.equal(r.statusCode, 302)
  assert.equal(r.headers.location, '/ru')
})

test('GET / follows the lang cookie and ignores unknown values', async t => {
  const a = await app(t)
  assert.equal((await a.inject({ url: '/', cookies: { lang: 'en' } })).headers.location, '/en')
  assert.equal((await a.inject({ url: '/', cookies: { lang: 'de' } })).headers.location, '/ru')
})

test('unknown pages render the 404 page in the right language', async t => {
  const a = await app(t)
  let r = await a.inject('/en/nope')
  assert.equal(r.statusCode, 404)
  assert.match(r.body, /Page not found/)
  r = await a.inject('/xx')
  assert.equal(r.statusCode, 404)
  assert.match(r.body, /Страница не найдена/)
  assert.match(r.body, /<html lang="ru"/)
})

test('CSS and JS URLs carry a version for cache busting', async t => {
  const r = await (await app(t)).inject('/ru/nope')
  assert.match(r.body, /\/static\/css\/site\.css\?v=[0-9a-z]+"/)
  assert.match(r.body, /\/static\/css\/fonts\.css\?v=[0-9a-z]+"/)
  assert.match(r.body, /\/static\/js\/site\.js\?v=[0-9a-z]+"/)
})

test('unexpected errors render the 500 page without details', async t => {
  const a = await makeApp()
  t.after(() => a.close())
  a.get('/uz/boom', async () => { throw new Error('secret detail') })
  const r = await a.inject('/uz/boom')
  assert.equal(r.statusCode, 500)
  assert.match(r.body, /Nimadir xato ketdi/)
  assert.doesNotMatch(r.body, /secret detail/)
})

test('public pages turn away uploads without reading them', async t => {
  const a = await app(t)
  const upload = multipart({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: Buffer.alloc(16 * 1024 * 1024, 65) } })
  for (const url of ['/ru', '/ru/nope', '/static/x']) {
    const r = await a.inject({ method: 'POST', url, ...upload })
    assert.notEqual(r.statusCode, 413, url)
    assert.ok([404, 415].includes(r.statusCode), `${url}: ${r.statusCode}`)
  }
})

test('robots.txt hides /admin and points to the sitemap', async t => {
  const r = await (await app(t)).inject('/robots.txt')
  assert.match(r.body, /Disallow: \/admin/)
  assert.match(r.body, /Sitemap: https:\/\/yaqin\.test\/sitemap\.xml/)
})

test('sitemap lists home and menu in three languages', async t => {
  const r = await (await app(t)).inject('/sitemap.xml')
  assert.equal((r.body.match(/<loc>/g) || []).length, 6)
  assert.match(r.body, /<loc>https:\/\/yaqin\.test\/uz\/menu<\/loc>/)
})

test('security headers forbid inline scripts', async t => {
  const r = await (await app(t)).inject('/robots.txt')
  const csp = r.headers['content-security-policy']
  assert.match(csp, /script-src 'self'/)
  assert.match(csp, /frame-src https:\/\/www\.google\.com https:\/\/maps\.google\.com/)
  assert.doesNotMatch(csp, /unsafe-inline/)
})

test('static files are cached for 7 days', async t => {
  const r = await (await app(t)).inject('/static/css/site.css')
  assert.equal(r.statusCode, 200)
  assert.match(r.headers['cache-control'], /max-age=604800/)
})

test('a fresh database gets the mockup menu', async t => {
  const a = await app(t)
  assert.equal(a.db.prepare('select count(*) n from categories').get().n, 5)
  assert.equal(a.db.prepare('select count(*) n from dishes').get().n, 24)
})

test('the menu is not re-seeded after the owner empties it', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-seed-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const cfg = testConfig({ dataDir: dir, dbFile: path.join(dir, 'yaqin.db'), uploadsDir: path.join(dir, 'uploads') })
  let a = await buildApp(cfg)
  a.db.exec('delete from dishes; delete from categories')
  await a.close()
  a = await buildApp(cfg)
  assert.equal(a.db.prepare('select count(*) n from categories').get().n, 0)
  await a.close()
})
