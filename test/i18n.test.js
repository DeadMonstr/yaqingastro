import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLang, tr, pick, formatPrice, LANGS } from '../src/services/i18n.js'
import { UI } from '../src/i18n/ui.js'

test('isLang accepts only ru, uz, en', () => {
  assert.equal(isLang('uz'), true)
  assert.equal(isLang('de'), false)
  assert.equal(isLang(undefined), false)
})

test('tr falls back to Russian for empty translations', () => {
  const v = { ru: 'Меню', uz: '  ', en: 'Menu' }
  assert.equal(tr(v, 'en'), 'Menu')
  assert.equal(tr(v, 'uz'), 'Меню')
  assert.equal(tr('plain', 'uz'), 'plain')
  assert.equal(tr(null, 'ru'), '')
})

test('pick reads row columns with Russian fallback', () => {
  const row = { name_ru: 'Шурпа', name_uz: '', name_en: 'Shurpa' }
  assert.equal(pick(row, 'name', 'en'), 'Shurpa')
  assert.equal(pick(row, 'name', 'uz'), 'Шурпа')
})

test('formatPrice groups thousands with no-break space', () => {
  assert.equal(formatPrice(95000), '95 000')
  assert.equal(formatPrice(1250000), '1 250 000')
  assert.equal(formatPrice(500), '500')
})

test('UI dictionary has the same keys in every language', () => {
  const keys = l => JSON.stringify(Object.keys(UI[l]).sort())
  for (const l of LANGS) assert.equal(keys(l), keys('ru'))
  assert.equal(UI.uz.cur, 'so’m')
  assert.equal(UI.en.units.pcs, 'pcs')
})
