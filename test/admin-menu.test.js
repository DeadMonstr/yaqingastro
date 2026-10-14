import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeApp } from './helpers/app.js'
import { loginAs } from './helpers/admin.js'
import { listCategories } from '../src/repos/categories.js'
import { getDish, listDishes } from '../src/repos/dishes.js'

const setup = async t => { const a = await makeApp(); t.after(() => a.close()); return { a, ...(await loginAs(a)) } }
const api = (a, s, url, body, withCsrf = true) => a.inject({
  method: 'POST', url, payload: body,
  headers: { cookie: s.cookie, 'content-type': 'application/json', ...(withCsrf ? { 'x-csrf-token': s.csrf } : {}) }
})

test('menu screen lists categories, dishes and actions', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin', headers: { cookie: s.cookie } })
  assert.equal(r.statusCode, 200)
  assert.match(r.body, /Завтраки/)
  assert.match(r.body, /href="\/admin\/categories\/1\/edit"/)
  assert.match(r.body, /href="\/admin\/dishes\/1\/edit"/)
  assert.match(r.body, /href="\/admin\/dishes\/new\?category=1"/)
  assert.match(r.body, /href="\/admin\/categories\/new"/)
})

test('menu screen shows prices with no-break spaces', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin', headers: { cookie: s.cookie } })
  assert.match(r.body, /<span class="dish__price">95\u00a0000\u00a0сум<\/span>/)
})

test('menu screen loads SortableJS and the admin script with the asset version', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin', headers: { cookie: s.cookie } })
  assert.match(r.body, /<script src="\/static\/vendor\/sortable\.min\.js\?v=[^"]+" defer><\/script>/)
  assert.match(r.body, /<script type="module" src="\/static\/js\/admin\.js\?v=[^"]+"><\/script>/)
  assert.equal((await s.a.inject('/static/vendor/sortable.min.js')).statusCode, 200)
})

test('menu screen marks hidden items and keeps the markup CSP-safe', async t => {
  const s = await setup(t)
  await api(s.a, s, '/admin/api/dishes/1/visibility', { visible: false })
  await api(s.a, s, '/admin/api/categories/2/visibility', { visible: false })
  const r = await s.a.inject({ url: '/admin', headers: { cookie: s.cookie } })
  assert.match(r.body, /<li class="dish is-hidden" data-id="1">/)
  assert.match(r.body, /<details class="cat is-hidden" data-cat-id="2"/)
  assert.match(r.body, /data-visibility-url="\/admin\/api\/dishes\/1\/visibility"/)
  assert.match(r.body, /data-visibility-url="\/admin\/api\/categories\/2\/visibility"/)
  assert.doesNotMatch(r.body, /\sstyle=|\son[a-z]+=/i)
  assert.doesNotMatch(r.body, /<script(?![^>]*\ssrc=)/)
})

test('category order is saved from the full id list', async t => {
  const s = await setup(t)
  const r = await api(s.a, s, '/admin/api/categories/order', { ids: [5, 4, 3, 2, 1] })
  assert.deepEqual(r.json(), { ok: true })
  assert.deepEqual(listCategories(s.a.db).map(c => c.id), [5, 4, 3, 2, 1])
})

test('a stale id list is rejected and nothing changes', async t => {
  const s = await setup(t)
  const r = await api(s.a, s, '/admin/api/categories/order', { ids: [1, 2] })
  assert.equal(r.statusCode, 400)
  assert.deepEqual(r.json(), { error: 'Список устарел, обновите страницу' })
  assert.deepEqual(listCategories(s.a.db).map(c => c.id), [1, 2, 3, 4, 5])
})

test('dish order is saved within its category only', async t => {
  const s = await setup(t)
  assert.equal((await api(s.a, s, '/admin/api/dishes/order', { categoryId: 1, ids: [5, 4, 3, 2, 1] })).statusCode, 200)
  assert.deepEqual(listDishes(s.a.db, 1).map(d => d.id), [5, 4, 3, 2, 1])
  assert.equal((await api(s.a, s, '/admin/api/dishes/order', { categoryId: 1, ids: [1, 2, 3, 4, 6] })).statusCode, 400)
})

test('dish order for a missing category is 404', async t => {
  const s = await setup(t)
  const r = await api(s.a, s, '/admin/api/dishes/order', { categoryId: 999, ids: [] })
  assert.equal(r.statusCode, 404)
  assert.deepEqual(r.json(), { error: 'Не найдено' })
})

test('visibility toggles save immediately', async t => {
  const s = await setup(t)
  assert.equal((await api(s.a, s, '/admin/api/dishes/1/visibility', { visible: false })).statusCode, 200)
  assert.equal(getDish(s.a.db, 1).is_visible, false)
  assert.equal((await api(s.a, s, '/admin/api/dishes/999/visibility', { visible: false })).statusCode, 404)
  assert.equal((await api(s.a, s, '/admin/api/categories/1/visibility', { visible: 'no' })).statusCode, 400)
})

test('category visibility toggles save and report a missing row', async t => {
  const s = await setup(t)
  assert.deepEqual((await api(s.a, s, '/admin/api/categories/1/visibility', { visible: false })).json(), { ok: true })
  assert.equal(listCategories(s.a.db)[0].is_visible, false)
  const missing = await api(s.a, s, '/admin/api/categories/999/visibility', { visible: true })
  assert.equal(missing.statusCode, 404)
  assert.deepEqual(missing.json(), { error: 'Не найдено' })
})

test('malformed bodies are 400 with a JSON message and change nothing', async t => {
  const s = await setup(t)
  const bad = [
    ['/admin/api/dishes/1/visibility', {}],
    ['/admin/api/dishes/1/visibility', { visible: 1 }],
    ['/admin/api/dishes/1/visibility', { visible: 'true' }],
    ['/admin/api/categories/order', { ids: 'x' }],
    ['/admin/api/categories/order', { ids: [1, 'a'] }],
    ['/admin/api/categories/order', {}],
    ['/admin/api/dishes/order', { ids: [1, 2, 3, 4, 5] }],
    ['/admin/api/dishes/order', { categoryId: 'x', ids: [1] }]
  ]
  for (const [url, body] of bad) {
    const r = await api(s.a, s, url, body)
    assert.equal(r.statusCode, 400, `${url} ${JSON.stringify(body)}`)
    assert.deepEqual(r.json(), { error: 'Неверные данные' }, `${url} ${JSON.stringify(body)}`)
  }
  assert.equal(getDish(s.a.db, 1).is_visible, true)
  assert.deepEqual(listCategories(s.a.db).map(c => c.id), [1, 2, 3, 4, 5])
})

test('api needs a session and a csrf token', async t => {
  const s = await setup(t)
  const anon = await s.a.inject({ method: 'POST', url: '/admin/api/categories/order', payload: { ids: [] }, headers: { 'content-type': 'application/json' } })
  assert.equal(anon.statusCode, 401)
  assert.equal((await api(s.a, s, '/admin/api/categories/order', { ids: [1, 2, 3, 4, 5] }, false)).statusCode, 403)
})
