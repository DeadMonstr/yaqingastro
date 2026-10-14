import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { makeApp } from './helpers/app.js'
import { loginAs, multipart } from './helpers/admin.js'
import { jpeg } from './helpers/fixtures.js'
import { CONTENT_SCHEMA, getGroup } from '../src/content-schema.js'
import { getStoredContent } from '../src/repos/content.js'

const setup = async t => { const a = await makeApp(); t.after(() => a.close()); return { a, ...(await loginAs(a)) } }
const groupFields = (id, o = {}) => {
  const f = {}
  for (const x of getGroup(id).fields) {
    if (x.type === 'image') continue
    if (x.translatable) for (const l of ['ru', 'uz', 'en']) f[`${x.key}.${l}`] = x.default[l]
    else f[x.key] = x.default
  }
  return { ...f, ...o }
}
const save = (s, id, fields) => { const m = multipart({ _csrf: s.csrf, ...fields }); return s.a.inject({ method: 'POST', url: `/admin/home/${id}`, headers: { cookie: s.cookie, ...m.headers }, payload: m.payload }) }
const uploads = s => fs.readdirSync(s.a.config.uploadsDir)
const photo = async name => ({ filename: name, type: 'image/jpeg', content: await jpeg() })

test('editor shows every group of the schema', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin/home', headers: { cookie: s.cookie } })
  for (const g of CONTENT_SCHEMA) assert.match(r.body, new RegExp(g.title))
})

test('saving a group updates the site', async t => {
  const s = await setup(t)
  const r = await save(s, 'hero', groupFields('hero', { 'hero.tagline.ru': 'Новый слоган' }))
  assert.equal(r.headers.location, '/admin/home?saved=1&group=hero')
  assert.match((await s.a.inject('/ru')).body, /Новый слоган/)
})

test('missing Russian text keeps the typed values', async t => {
  const s = await setup(t)
  const r = await save(s, 'about', groupFields('about', { 'about.title.ru': '', 'about.p1.ru': 'Мой абзац' }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Заполните текст на русском/)
  assert.match(r.body, /Мой абзац/)
})

test('an invalid group with a photo saves nothing', async t => {
  const s = await setup(t)
  const r = await save(s, 'hero', groupFields('hero', { 'hero.tagline.ru': '', 'hero.image': { filename: 'h.jpg', type: 'image/jpeg', content: await jpeg() } }))
  assert.equal(r.statusCode, 400)
  assert.deepEqual(uploads(s), [])
  assert.deepEqual(getStoredContent(s.a.db), {})
})

test('telegram given as a link is stored as a username', async t => {
  const s = await setup(t)
  await save(s, 'contacts', groupFields('contacts', { 'contacts.telegram': 'https://t.me/yaqin_new' }))
  assert.match((await s.a.inject('/ru')).body, /href="https:\/\/t\.me\/yaqin_new"/)
})

test('replacing a photo removes the old one and reset restores the default', async t => {
  const s = await setup(t)
  await save(s, 'hero', groupFields('hero', { 'hero.image': { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const first = getStoredContent(s.a.db)['hero.image'].image
  await save(s, 'hero', groupFields('hero', { 'hero.image': { filename: 'b.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const second = getStoredContent(s.a.db)['hero.image'].image
  assert.ok(uploads(s).every(f => f.startsWith(second)))
  assert.notEqual(first, second)
  await save(s, 'hero', groupFields('hero', { 'hero.image.reset': 'on' }))
  assert.deepEqual(uploads(s), [])
  assert.match((await s.a.inject('/ru')).body, /hero-default\.webp/)
})

test('unknown group is 404', async t => {
  const s = await setup(t)
  assert.equal((await save(s, 'nope', {})).statusCode, 404)
})

test('the editor needs a session', async t => {
  const s = await setup(t)
  const r = await s.a.inject('/admin/home')
  assert.equal(r.statusCode, 302)
  assert.match(r.headers.location, /^\/admin\/login/)
})

test('only the requested group is open, and the group from the address', async t => {
  const s = await setup(t)
  const opened = body => [...body.matchAll(/<details class="group" id="group-(\w+)"( open)?>/g)].filter(m => m[2]).map(m => m[1])
  assert.deepEqual(opened((await s.a.inject({ url: '/admin/home', headers: { cookie: s.cookie } })).body), [])
  assert.deepEqual(opened((await s.a.inject({ url: '/admin/home?group=about', headers: { cookie: s.cookie } })).body), ['about'])
})

test('a failed group opens with its error and the other groups stay shut', async t => {
  const s = await setup(t)
  const r = await save(s, 'about', groupFields('about', { 'about.title.ru': '' }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /<details class="group" id="group-about" open>/)
  assert.equal((r.body.match(/<details class="group" id="group-\w+" open>/g) ?? []).length, 1)
})

test('a too long translation is reported on its own language only', async t => {
  const s = await setup(t)
  const r = await save(s, 'hero', groupFields('hero', { 'hero.tagline.uz': 'x'.repeat(201) }))
  assert.equal(r.statusCode, 400)
  assert.equal((r.body.match(/Не длиннее 200 символов/g) ?? []).length, 1)
  assert.match(r.body, /id="hero\.tagline\.uz"[^>]*aria-invalid="true"/)
  assert.doesNotMatch(r.body, /id="hero\.tagline\.ru"[^>]*aria-invalid/)
})

test('saving a group writes only that group', async t => {
  const s = await setup(t)
  await save(s, 'order', groupFields('order'))
  assert.deepEqual(Object.keys(getStoredContent(s.a.db)).sort(), ['order.description', 'order.title'])
})

test('empty file inputs in a text-only save keep the current photo', async t => {
  const s = await setup(t)
  await save(s, 'hero', groupFields('hero', { 'hero.image': await photo('a.jpg') }))
  const id = getStoredContent(s.a.db)['hero.image'].image
  const r = await save(s, 'hero', groupFields('hero', { 'hero.tagline.ru': 'Другой', 'hero.image': { filename: '', type: 'application/octet-stream', content: Buffer.alloc(0) } }))
  assert.equal(r.statusCode, 302)
  assert.equal(getStoredContent(s.a.db)['hero.image'].image, id)
  assert.equal(uploads(s).length, 2)
})

test('an unreadable photo is reported at its field and the photos saved before it are removed', async t => {
  const s = await setup(t)
  const r = await save(s, 'gallery', groupFields('gallery', {
    'gallery.image1': await photo('1.jpg'),
    'gallery.image2': { filename: 'x.heic', type: 'image/heic', content: Buffer.from('not an image') }
  }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Не удалось прочитать фото/)
  assert.deepEqual(uploads(s), [])
  assert.deepEqual(getStoredContent(s.a.db), {})
})

test('the gallery takes all four photos in one request', async t => {
  const s = await setup(t)
  const r = await save(s, 'gallery', groupFields('gallery', Object.fromEntries(await Promise.all([1, 2, 3, 4].map(async n => [`gallery.image${n}`, await photo(`${n}.jpg`)])))))
  assert.equal(r.statusCode, 302)
  const stored = getStoredContent(s.a.db)
  assert.deepEqual([1, 2, 3, 4].filter(n => stored[`gallery.image${n}`]), [1, 2, 3, 4])
  assert.equal(uploads(s).length, 8)
})

test('a new photo wins over reset in the same request', async t => {
  const s = await setup(t)
  await save(s, 'hero', groupFields('hero', { 'hero.image': await photo('a.jpg') }))
  await save(s, 'hero', groupFields('hero', { 'hero.image': await photo('b.jpg'), 'hero.image.reset': 'on' }))
  const id = getStoredContent(s.a.db)['hero.image'].image
  assert.ok(uploads(s).length === 2 && uploads(s).every(f => f.startsWith(id)))
})

test('the editor shows the saved photo, and the default hero until one is saved', async t => {
  const s = await setup(t)
  const page = () => s.a.inject({ url: '/admin/home', headers: { cookie: s.cookie } }).then(r => r.body)
  assert.match(await page(), /\/static\/img\/hero-default\.webp/)
  await save(s, 'hero', groupFields('hero', { 'hero.image': await photo('a.jpg') }))
  const id = getStoredContent(s.a.db)['hero.image'].image
  const body = await page()
  assert.match(body, new RegExp(`/uploads/${id}-1200\\.webp`))
  assert.doesNotMatch(body, /hero-default\.webp/)
})
