import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { openDb, migrate } from '../src/db/index.js'
import * as C from '../src/repos/categories.js'
import * as D from '../src/repos/dishes.js'
import { getPublicMenu, getAdminMenu } from '../src/repos/menu.js'

let db
const cat = (slug, extra = {}) => C.createCategory(db, { slug, name_ru: slug, name_uz: '', name_en: '', is_visible: true, ...extra })
const dish = (category_id, name, extra = {}) => D.createDish(db, {
  category_id, name_ru: name, name_uz: '', name_en: '', desc_ru: '', desc_uz: '', desc_en: '',
  amount: null, unit: null, price: 1000, image: null, is_visible: true, ...extra
})
beforeEach(() => { db = openDb(':memory:'); migrate(db) })

test('new categories and dishes go to the end', () => {
  const a = cat('a'), b = cat('b')
  assert.deepEqual([a.sort_order, b.sort_order], [1, 2])
  const d1 = dish(a.id, 'x'), d2 = dish(a.id, 'y')
  assert.deepEqual([d1.sort_order, d2.sort_order], [1, 2])
  assert.equal(a.is_visible, true)
})

test('deleteCategory refuses while dishes exist, even hidden ones', () => {
  const a = cat('a')
  dish(a.id, 'x', { is_visible: false })
  assert.equal(C.deleteCategory(db, a.id), 'not_empty')
  assert.ok(C.getCategory(db, a.id))
  const b = cat('b')
  assert.equal(C.deleteCategory(db, b.id), 'deleted')
  assert.equal(C.deleteCategory(db, 999), 'not_found')
})

test('moving a dish to another category puts it at the end', () => {
  const a = cat('a'), b = cat('b')
  dish(b.id, 'b1'); dish(b.id, 'b2')
  const d = dish(a.id, 'a1')
  const moved = D.updateDish(db, d.id, { ...d, category_id: b.id })
  assert.equal(moved.category_id, b.id)
  assert.equal(moved.sort_order, 3)
})

test('reorderCategories accepts only the full id set', () => {
  const a = cat('a'), b = cat('b'), c = cat('c')
  assert.equal(C.reorderCategories(db, [a.id, b.id]), false)
  assert.deepEqual(C.listCategories(db).map(x => x.slug), ['a', 'b', 'c'])
  assert.equal(C.reorderCategories(db, [c.id, a.id, b.id]), true)
  assert.deepEqual(C.listCategories(db).map(x => x.slug), ['c', 'a', 'b'])
})

test('reorderDishes rejects ids from another category', () => {
  const a = cat('a'), b = cat('b')
  const x = dish(a.id, 'x'), y = dish(a.id, 'y'), z = dish(b.id, 'z')
  assert.equal(D.reorderDishes(db, a.id, [y.id, z.id]), false)
  assert.equal(D.reorderDishes(db, a.id, [y.id, x.id]), true)
  assert.deepEqual(D.listDishes(db, a.id).map(d => d.name_ru), ['y', 'x'])
})

test('getPublicMenu shows only visible dishes in visible non-empty categories', () => {
  const a = cat('a'), hidden = cat('hidden', { is_visible: false }), empty = cat('empty'), allHidden = cat('all-hidden')
  dish(a.id, 'shown'); dish(a.id, 'off', { is_visible: false })
  dish(hidden.id, 'h')
  dish(allHidden.id, 'h2', { is_visible: false })
  const menu = getPublicMenu(db)
  assert.deepEqual(menu.map(c => c.slug), ['a'])
  assert.deepEqual(menu[0].dishes.map(d => d.name_ru), ['shown'])
  assert.equal(getAdminMenu(db).length, 4)
  assert.equal(empty.slug, 'empty')
})

test('visibility setters report missing rows', () => {
  const a = cat('a'), d = dish(a.id, 'x')
  assert.equal(D.setDishVisible(db, d.id, false), true)
  assert.equal(D.getDish(db, d.id).is_visible, false)
  assert.equal(C.setCategoryVisible(db, 999, false), false)
})

test('unit must be g, ml or pcs', () => {
  const a = cat('a')
  assert.throws(() => dish(a.id, 'x', { amount: 1, unit: 'kg' }), /CHECK/)
})

test('isSlugTaken can exclude the category being edited', () => {
  const a = cat('a')
  assert.equal(C.isSlugTaken(db, 'a'), true)
  assert.equal(C.isSlugTaken(db, 'a', a.id), false)
})
