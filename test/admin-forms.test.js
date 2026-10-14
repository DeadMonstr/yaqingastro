import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { makeApp } from './helpers/app.js'
import { loginAs, form, multipart } from './helpers/admin.js'
import { jpeg } from './helpers/fixtures.js'
import { getCategory, listCategories } from '../src/repos/categories.js'
import { getDish, listDishes, countDishes } from '../src/repos/dishes.js'

const setup = async t => { const a = await makeApp(); t.after(() => a.close()); return { a, ...(await loginAs(a)) } }
const postForm = (s, url, fields) => s.a.inject({ method: 'POST', url, headers: { cookie: s.cookie, ...form({}).headers }, payload: form({ _csrf: s.csrf, ...fields }).payload })
const postMultipart = (s, url, fields) => { const m = multipart({ _csrf: s.csrf, ...fields }); return s.a.inject({ method: 'POST', url, headers: { cookie: s.cookie, ...m.headers }, payload: m.payload }) }
const dishFields = o => ({ category_id: '1', name_ru: 'Плов', name_uz: '', name_en: '', desc_ru: '', desc_uz: '', desc_en: '', amount: '', unit: 'g', price: '45000', is_visible: 'on', ...o })
const uploads = s => fs.readdirSync(s.a.config.uploadsDir)
const get = (s, url) => s.a.inject({ url, headers: { cookie: s.cookie } })

test('new category gets a slug from the English or Russian name', async t => {
  const s = await setup(t)
  assert.equal((await postForm(s, '/admin/categories', { name_ru: 'Пицца', name_en: 'Pizza', is_visible: 'on' })).headers.location, '/admin?saved=1')
  await postForm(s, '/admin/categories', { name_ru: 'Пицца' })
  assert.deepEqual(listCategories(s.a.db).slice(-2).map(c => c.slug), ['pizza', 'pitstsa'])
})

test('a taken slug is rejected', async t => {
  const s = await setup(t)
  const r = await postForm(s, '/admin/categories', { name_ru: 'Супы 2', slug: 'soups' })
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Такой адрес уже есть/)
})

test('a category with dishes cannot be deleted', async t => {
  const s = await setup(t)
  const r = await postForm(s, '/admin/categories/1/delete', {})
  assert.equal(r.statusCode, 409)
  assert.match(r.body, /Сначала перенесите или удалите блюда этой категории/)
  assert.ok(getCategory(s.a.db, 1))
})

test('creating a dish with a photo stores WebP files', async t => {
  const s = await setup(t)
  const r = await postMultipart(s, '/admin/dishes', dishFields({ photo: { filename: 'p.jpg', type: 'image/jpeg', content: await jpeg() } }))
  assert.equal(r.headers.location, '/admin?saved=1')
  const d = listDishes(s.a.db, 1).at(-1)
  assert.equal(d.name_ru, 'Плов')
  assert.deepEqual(uploads(s).sort(), [`${d.image}-400.webp`, `${d.image}-800.webp`])
})

test('price typed with a space is saved as a number', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes', dishFields({ price: '95 000' }))
  assert.equal(listDishes(s.a.db, 1).at(-1).price, 95000)
})

test('an unreadable photo shows an error and creates nothing', async t => {
  const s = await setup(t)
  const before = countDishes(s.a.db, 1)
  const r = await postMultipart(s, '/admin/dishes', dishFields({ photo: { filename: 'p.heic', type: 'image/heic', content: Buffer.from('not an image') } }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Не удалось прочитать фото/)
  assert.equal(countDishes(s.a.db, 1), before)
  assert.deepEqual(uploads(s), [])
})

test('validation errors keep what was typed', async t => {
  const s = await setup(t)
  const r = await postMultipart(s, '/admin/dishes', dishFields({ name_ru: '', price: '1000', desc_ru: 'Мой текст' }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Введите название на русском/)
  assert.match(r.body, /value="1000"/)
  assert.match(r.body, /Мой текст/)
})

test('replacing and removing a photo deletes old files', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const first = getDish(s.a.db, 1).image
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'b.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const second = getDish(s.a.db, 1).image
  assert.notEqual(first, second)
  assert.ok(uploads(s).every(f => f.startsWith(second)))
  await postMultipart(s, '/admin/dishes/1', dishFields({ remove_photo: 'on' }))
  assert.equal(getDish(s.a.db, 1).image, null)
  assert.deepEqual(uploads(s), [])
})

test('moving a dish puts it at the end of the new category', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({ category_id: '5' }))
  assert.equal(listDishes(s.a.db, 5).at(-1).id, 1)
})

test('deleting a dish deletes its photo', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  assert.equal((await postForm(s, '/admin/dishes/1/delete', {})).headers.location, '/admin?saved=1')
  assert.equal(getDish(s.a.db, 1), undefined)
  assert.deepEqual(uploads(s), [])
})

test('new dish form preselects the category and missing ids are 404', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin/dishes/new?category=3', headers: { cookie: s.cookie } })
  assert.match(r.body, /<option value="3" selected/)
  assert.equal((await s.a.inject({ url: '/admin/dishes/999/edit', headers: { cookie: s.cookie } })).statusCode, 404)
})

// ---- Дополнительные проверки ----

test('form pages render with tabs, a csrf field and CSP-safe markup', async t => {
  const s = await setup(t)
  for (const url of ['/admin/categories/new', '/admin/categories/1/edit', '/admin/dishes/new', '/admin/dishes/1/edit']) {
    const r = await get(s, url)
    assert.equal(r.statusCode, 200, url)
    assert.match(r.body, /<div class="lang-tabs" data-lang-tabs/, url)
    assert.match(r.body, /name="_csrf" value="[^"]+"/, url)
    assert.match(r.body, /<div class="field" data-lang="uz">/, url)
    assert.doesNotMatch(r.body, /\sstyle=|\son[a-z]+=/i, url)
    assert.doesNotMatch(r.body, /<script(?![^>]*\ssrc=)/, url)
  }
})

test('dish form is multipart with a photo input, units and a delete button on edit', async t => {
  const s = await setup(t)
  const create = (await get(s, '/admin/dishes/new')).body
  assert.match(create, /<form class="card" method="post" action="\/admin\/dishes" enctype="multipart\/form-data">/)
  assert.match(create, /<input class="file-input" id="photo" name="photo" type="file" accept="image\/\*" data-image-input>/)
  assert.match(create, /<option value="g" selected>/)
  assert.match(create, /name="price" type="text" inputmode="numeric"/)
  assert.doesNotMatch(create, /data-confirm/)
  const edit = (await get(s, '/admin/dishes/1/edit')).body
  assert.match(edit, /<form class="danger-zone" method="post" action="\/admin\/dishes\/1\/delete" data-confirm="Удалить блюдо\?">/)
  assert.match(edit, /value="Английский завтрак"/)
  assert.match(edit, /value="95000"/)
  assert.match(edit, /<option value="g" selected>/)
})

test('a saved photo shows as a thumbnail with a remove checkbox', async t => {
  const s = await setup(t)
  assert.doesNotMatch((await get(s, '/admin/dishes/1/edit')).body, /name="remove_photo"/)
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const { image } = getDish(s.a.db, 1)
  const body = (await get(s, '/admin/dishes/1/edit')).body
  assert.match(body, new RegExp(`src="/uploads/${image}-400.webp"`))
  assert.match(body, /name="remove_photo"/)
})

test('an error re-render keeps raw strings, the chosen category and asks to pick the photo again', async t => {
  const s = await setup(t)
  const r = await postMultipart(s, '/admin/dishes', dishFields({ category_id: '2', name_ru: '', price: '95 000', amount: '12', unit: 'ml' }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /<option value="2" selected>/)
  assert.match(r.body, /value="95 000"/)
  assert.match(r.body, /<option value="ml" selected>/)
  assert.match(r.body, /Выберите фото заново/)
  assert.match(r.body, /<p class="field-error"[^>]*>Введите название на русском<\/p>/)
})

test('a dish in an unknown category is rejected and nothing is stored', async t => {
  const s = await setup(t)
  const before = countDishes(s.a.db, 1)
  const r = await postMultipart(s, '/admin/dishes', dishFields({ category_id: '999' }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Выберите категорию/)
  assert.equal(countDishes(s.a.db, 1), before)
})

test('validation errors do not touch the stored photo', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const { image } = getDish(s.a.db, 1)
  const r = await postMultipart(s, '/admin/dishes/1', dishFields({ name_ru: '', remove_photo: 'on', photo: { filename: 'b.jpg', type: 'image/jpeg', content: await jpeg() } }))
  assert.equal(r.statusCode, 400)
  assert.equal(getDish(s.a.db, 1).image, image)
  assert.ok(uploads(s).every(f => f.startsWith(image)))
})

test('an unreadable photo on edit keeps the old photo and the dish unchanged', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const before = getDish(s.a.db, 1)
  const r = await postMultipart(s, '/admin/dishes/1', dishFields({ name_ru: 'Другое', photo: { filename: 'p.heic', type: 'image/heic', content: Buffer.from('nope') } }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Не удалось прочитать фото/)
  assert.deepEqual(getDish(s.a.db, 1), before)
  assert.ok(uploads(s).every(f => f.startsWith(before.image)))
})

test('an empty file input keeps the existing photo', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({ photo: { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const { image } = getDish(s.a.db, 1)
  const r = await postMultipart(s, '/admin/dishes/1', dishFields({ name_ru: 'Новое имя', photo: { filename: '', type: 'application/octet-stream', content: Buffer.alloc(0) } }))
  assert.equal(r.headers.location, '/admin?saved=1')
  assert.equal(getDish(s.a.db, 1).image, image)
  assert.equal(getDish(s.a.db, 1).name_ru, 'Новое имя')
})

test('editing a dish saves every field', async t => {
  const s = await setup(t)
  await postMultipart(s, '/admin/dishes/1', dishFields({
    name_ru: 'Плов', name_uz: 'Palov', name_en: 'Pilaf', desc_ru: 'Рис', desc_uz: 'Guruch', desc_en: 'Rice',
    amount: '300', unit: 'ml', price: '12 500', is_visible: ''
  }))
  const d = getDish(s.a.db, 1)
  assert.deepEqual(
    [d.name_uz, d.name_en, d.desc_ru, d.desc_uz, d.desc_en, d.amount, d.unit, d.price, d.is_visible],
    ['Palov', 'Pilaf', 'Рис', 'Guruch', 'Rice', 300, 'ml', 12500, false]
  )
})

test('dish routes answer 404 for unknown or malformed ids', async t => {
  const s = await setup(t)
  assert.equal((await postMultipart(s, '/admin/dishes/999', dishFields())).statusCode, 404)
  assert.equal((await postForm(s, '/admin/dishes/999/delete', {})).statusCode, 404)
  assert.equal((await get(s, '/admin/dishes/abc/edit')).statusCode, 404)
  assert.equal((await get(s, '/admin/categories/999/edit')).statusCode, 404)
  assert.equal((await postForm(s, '/admin/categories/999', { name_ru: 'x' })).statusCode, 404)
  assert.equal((await postForm(s, '/admin/categories/999/delete', {})).statusCode, 404)
})

test('new dish form falls back to the first category for an unknown one', async t => {
  const s = await setup(t)
  assert.match((await get(s, '/admin/dishes/new?category=999')).body, /<option value="1" selected>/)
  assert.match((await get(s, '/admin/dishes/new')).body, /<option value="1" selected>/)
})

test('category edit form shows the stored values and saves changes', async t => {
  const s = await setup(t)
  const page = (await get(s, '/admin/categories/2/edit')).body
  assert.match(page, /value="Кофе и напитки"/)
  assert.match(page, /value="drinks"/)
  assert.match(page, /data-confirm="Удалить категорию\?"/)
  const r = await postForm(s, '/admin/categories/2', { name_ru: 'Напитки', name_uz: '', name_en: 'Drinks', slug: 'drinks' })
  assert.equal(r.headers.location, '/admin?saved=1')
  const c = getCategory(s.a.db, 2)
  assert.deepEqual([c.name_ru, c.slug, c.is_visible], ['Напитки', 'drinks', false])
})

test('clearing the slug on edit makes a new one that ignores the category itself', async t => {
  const s = await setup(t)
  await postForm(s, '/admin/categories/2', { name_ru: 'Кофе', name_en: 'Drinks', slug: '' })
  assert.equal(getCategory(s.a.db, 2).slug, 'drinks')
  assert.equal((await postForm(s, '/admin/categories/2', { name_ru: 'Кофе', slug: 'soups' })).statusCode, 400)
})

test('category errors keep what was typed and show a message at each field', async t => {
  const s = await setup(t)
  const r = await postForm(s, '/admin/categories', { name_ru: '', name_uz: 'Palov', slug: 'Bad Slug' })
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /value="Palov"/)
  assert.match(r.body, /value="Bad Slug"/)
  assert.match(r.body, /<p class="field-error"[^>]*>Только латиница, цифры и дефис<\/p>/)
  assert.match(r.body, /<p class="field-error"[^>]*>Введите название на русском<\/p>/)
})

test('an empty category can be deleted', async t => {
  const s = await setup(t)
  await postForm(s, '/admin/categories', { name_ru: 'Пицца' })
  const { id } = listCategories(s.a.db).at(-1)
  assert.equal((await postForm(s, `/admin/categories/${id}/delete`, {})).headers.location, '/admin?saved=1')
  assert.equal(getCategory(s.a.db, id), undefined)
})

test('a refused category delete shows the edit form again', async t => {
  const s = await setup(t)
  const r = await postForm(s, '/admin/categories/1/delete', {})
  assert.match(r.body, /<p class="alert" role="alert">Сначала перенесите или удалите блюда этой категории<\/p>/)
  assert.match(r.body, /value="Завтраки"/)
})

test('form posts without a csrf token are refused', async t => {
  const s = await setup(t)
  const m = multipart(dishFields({ name_ru: 'Без токена' }))
  const r = await s.a.inject({ method: 'POST', url: '/admin/dishes', headers: { cookie: s.cookie, ...m.headers }, payload: m.payload })
  assert.equal(r.statusCode, 403)
  assert.equal(listDishes(s.a.db, 1).some(d => d.name_ru === 'Без токена'), false)
})
