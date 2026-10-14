import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeApp } from './helpers/app.js'
import { createDish, setDishVisible } from '../src/repos/dishes.js'
import { setCategoryVisible } from '../src/repos/categories.js'

const app = async t => { const a = await makeApp(); t.after(() => a.close()); return a }
const newDish = (db, extra) => createDish(db, {
  category_id: 1, name_ru: 'Тест', name_uz: '', name_en: '', desc_ru: '', desc_uz: '', desc_en: '',
  amount: null, unit: null, price: 1000, image: null, is_visible: true, ...extra
})

test('menu lists seeded categories as tabs and sections in order', async t => {
  const body = (await (await app(t)).inject('/ru/menu')).body
  assert.match(body, /href="#cat-breakfast"/)
  assert.ok(body.indexOf('id="cat-breakfast"') < body.indexOf('id="cat-soups"'))
  assert.match(body, /Английский завтрак/)
  assert.match(body, /Яичница, говяжий бекон/)
  assert.equal((body.match(/<dialog class="sheet"/g) || []).length, 1)
})

test('menu hides hidden dishes and categories without visible dishes', async t => {
  const a = await app(t)
  setDishVisible(a.db, 1, false)
  setCategoryVisible(a.db, 2, false)
  for (const id of [21, 22, 23, 24]) setDishVisible(a.db, id, false)
  const body = (await a.inject('/ru/menu')).body
  assert.doesNotMatch(body, /Английский завтрак/)
  assert.doesNotMatch(body, /cat-drinks/)
  assert.doesNotMatch(body, /cat-soups/)
})

test('prices, units and currency are localized', async t => {
  const a = await app(t)
  assert.match((await a.inject('/ru/menu')).body, /95 000/)
  assert.match((await a.inject('/ru/menu')).body, /420 г/)
  assert.match((await a.inject('/en/menu')).body, /UZS/)
  assert.match((await a.inject('/en/menu')).body, /300 ml/)
  assert.match((await a.inject('/uz/menu')).body, /so’m/)
  newDish(a.db, { name_ru: 'Круассан штучный', amount: 1, unit: 'pcs' })
  assert.match((await a.inject('/ru/menu')).body, /1 шт/)
})

test('empty translations fall back to Russian', async t => {
  const a = await app(t)
  newDish(a.db, { name_ru: 'Только по-русски' })
  assert.match((await a.inject('/en/menu')).body, /Только по-русски/)
})

test('dish photos use srcset, missing photos use the placeholder', async t => {
  const a = await app(t)
  newDish(a.db, { name_ru: 'С фото', image: 'dish-abc' })
  const body = (await a.inject('/ru/menu')).body
  assert.match(body, /\/uploads\/dish-abc-400\.webp 400w, \/uploads\/dish-abc-800\.webp 800w/)
  assert.match(body, /class="ph"/)
})

test('dish names are escaped', async t => {
  const a = await app(t)
  newDish(a.db, { name_ru: '<img src=x onerror=alert(1)>' })
  assert.doesNotMatch((await a.inject('/ru/menu')).body, /<img src=x/)
})

test('menu remembers the language in a cookie and rejects unknown languages', async t => {
  const a = await app(t)
  const cookie = (await a.inject('/uz/menu')).cookies.find(x => x.name === 'lang')
  assert.equal(cookie.value, 'uz')
  assert.equal(cookie.path, '/')
  assert.equal(cookie.maxAge, 31536000)
  assert.equal((await a.inject('/de/menu')).statusCode, 404)
})

test('menu page has its title, language alternates and script', async t => {
  const body = (await (await app(t)).inject('/en/menu')).body
  assert.match(body, /<title>Menu — YAQIN Gastro Cafe<\/title>/)
  assert.match(body, /<link rel="canonical" href="https:\/\/yaqin\.test\/en\/menu">/)
  assert.match(body, /<script src="\/static\/js\/menu\.js\?v=[^"]+" defer><\/script>/)
  assert.match(body, /aria-label="Close"/)
})

test('dish photo alt is the dish name', async t => {
  const a = await app(t)
  newDish(a.db, { name_ru: 'Блюдо с фото', image: 'dish-abc' })
  assert.match((await a.inject('/ru/menu')).body, /<img class="photo"[^>]* alt="Блюдо с фото"/)
})
