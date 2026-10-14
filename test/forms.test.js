import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDishForm, parseCategoryForm } from '../src/routes/admin/forms.js'

const dishBody = o => ({ category_id: '1', name_ru: 'Плов', name_uz: '', name_en: '', desc_ru: '', desc_uz: '', desc_en: '', amount: '', unit: 'g', price: '45000', ...o })

test('price accepts spaces and no-break spaces typed on a phone', () => {
  assert.equal(parseDishForm(dishBody({ price: '95 000' }), [1]).values.price, 95000)
  assert.equal(parseDishForm(dishBody({ price: '95 000' }), [1]).values.price, 95000)
})

test('price must be an integer from 0 to 100 000 000', () => {
  for (const price of ['-1', '100000001', '12.5', '']) {
    assert.equal(parseDishForm(dishBody({ price }), [1]).errors.price, 'Цена — целое число от 0 до 100 000 000')
  }
  assert.equal(parseDishForm(dishBody({ price: '0' }), [1]).values.price, 0)
  assert.equal(parseDishForm(dishBody({ price: '100 000 000' }), [1]).values.price, 100000000)
})

test('amount is optional and unit is ignored without it', () => {
  let v = parseDishForm(dishBody({ amount: '', unit: 'g' }), [1]).values
  assert.deepEqual([v.amount, v.unit], [null, null])
  v = parseDishForm(dishBody({ amount: '420', unit: 'g' }), [1]).values
  assert.deepEqual([v.amount, v.unit], [420, 'g'])
  assert.equal(parseDishForm(dishBody({ amount: 'abc' }), [1]).errors.amount, 'Количество — целое число')
  assert.equal(parseDishForm(dishBody({ amount: '100001' }), [1]).errors.amount, 'Количество — целое число')
  assert.equal(parseDishForm(dishBody({ amount: '1', unit: 'kg' }), [1]).errors.amount, 'Выберите единицу')
})

test('dish text fields are required and limited', () => {
  const e = parseDishForm(dishBody({ name_ru: ' ', desc_en: 'x'.repeat(501), category_id: '9' }), [1]).errors
  assert.equal(e.name_ru, 'Введите название на русском')
  assert.equal(e.desc_en, 'Не длиннее 500 символов')
  assert.equal(e.category_id, 'Выберите категорию')
  assert.equal(parseDishForm(dishBody({ name_uz: 'x'.repeat(121) }), [1]).errors.name_uz, 'Не длиннее 120 символов')
})

test('a valid dish form gives trimmed values and no errors', () => {
  const { values, errors } = parseDishForm(dishBody({ name_ru: '  Плов  ', desc_ru: ' с бараниной ', is_visible: 'on' }), [1, 2])
  assert.deepEqual(errors, {})
  assert.deepEqual(values, {
    category_id: 1, name_ru: 'Плов', name_uz: '', name_en: '', desc_ru: 'с бараниной', desc_uz: '', desc_en: '',
    amount: null, unit: null, price: 45000, is_visible: true
  })
})

test('missing and non-string dish fields count as empty', () => {
  const { values, errors } = parseDishForm({ name_ru: ['x'], price: 5 }, [1])
  assert.equal(errors.name_ru, 'Введите название на русском')
  assert.equal(errors.price, 'Цена — целое число от 0 до 100 000 000')
  assert.equal(errors.category_id, 'Выберите категорию')
  assert.equal(values.is_visible, false)
  assert.equal(parseDishForm(undefined, [1]).errors.name_ru, 'Введите название на русском')
})

test('category slug must be latin with dashes', () => {
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', slug: 'Bad Slug' }).errors.slug, 'Только латиница, цифры и дефис')
  assert.equal(parseCategoryForm({ name_ru: 'x'.repeat(61) }).errors.name_ru, 'Не длиннее 60 символов')
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', is_visible: 'on' }).values.is_visible, true)
})

test('category slug is empty when not typed and kept when valid', () => {
  assert.equal(parseCategoryForm({ name_ru: 'Пицца' }).values.slug, '')
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', slug: ' hot-pizza ' }).values.slug, 'hot-pizza')
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', slug: '-pizza' }).errors.slug, 'Только латиница, цифры и дефис')
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', slug: 'a'.repeat(61) }).errors.slug, 'Не длиннее 60 символов')
})

test('category name is required and missing keys count as empty', () => {
  assert.equal(parseCategoryForm({}).errors.name_ru, 'Введите название на русском')
  assert.equal(parseCategoryForm(undefined).errors.name_ru, 'Введите название на русском')
  assert.deepEqual(parseCategoryForm({ name_ru: ' Пицца ', name_uz: 'Pitsa', name_en: 'Pizza' }).values, {
    slug: '', name_ru: 'Пицца', name_uz: 'Pitsa', name_en: 'Pizza', is_visible: false
  })
})
