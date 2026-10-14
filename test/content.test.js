import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb, migrate } from '../src/db/index.js'
import { CONTENT_SCHEMA, getGroup, resolveContent, validateGroupInput, localizeContent } from '../src/content-schema.js'
import { getStoredContent, saveContent, deleteContent } from '../src/repos/content.js'

const groupBody = (groupId, overrides = {}) => {
  const body = {}
  for (const f of getGroup(groupId).fields) {
    if (f.type === 'image') continue
    if (f.translatable) for (const l of ['ru', 'uz', 'en']) body[`${f.key}.${l}`] = f.default[l]
    else body[f.key] = f.default
  }
  return { ...body, ...overrides }
}

test('schema has the seven groups from the spec in page order', () => {
  assert.deepEqual(CONTENT_SCHEMA.map(g => g.id), ['hero', 'info', 'about', 'gallery', 'order', 'contacts', 'location'])
  assert.equal(getGroup('gallery').fields.filter(f => f.type === 'image').length, 4)
})

test('resolveContent uses mockup defaults and stored overrides', () => {
  const r = resolveContent({})
  assert.equal(r['hero.tagline'].ru, 'Больше, чем просто кафе')
  assert.equal(r['contacts.telegram'], 'yaqin_gastro')
  assert.equal(r['hero.image'], null)
  const r2 = resolveContent({ 'hero.tagline': { ru: 'Новый', uz: '', en: '' }, 'hero.image': { image: 'hero-abc' } })
  assert.equal(r2['hero.tagline'].ru, 'Новый')
  assert.equal(r2['hero.image'], 'hero-abc')
})

test('localizeContent falls back to Russian', () => {
  const r = resolveContent({ 'hero.tagline': { ru: 'Новый', uz: '', en: 'New' } })
  assert.equal(localizeContent(r, 'uz')['hero.tagline'], 'Новый')
  assert.equal(localizeContent(r, 'en')['hero.tagline'], 'New')
})

test('validateGroupInput requires Russian text and limits length', () => {
  let res = validateGroupInput(getGroup('hero'), groupBody('hero', { 'hero.tagline.ru': '  ' }))
  assert.equal(res.errors['hero.tagline'], 'Заполните текст на русском')
  res = validateGroupInput(getGroup('hero'), groupBody('hero', { 'hero.tagline.en': 'x'.repeat(201) }))
  assert.equal(res.errors['hero.tagline'], 'Не длиннее 200 символов')
  res = validateGroupInput(getGroup('hero'), groupBody('hero', { 'hero.tagline.uz': '' }))
  assert.deepEqual(res.errors, {})
  assert.equal(res.values['hero.tagline'].uz, '')
})

test('validateGroupInput checks phone and normalizes usernames', () => {
  let res = validateGroupInput(getGroup('contacts'), groupBody('contacts', {
    'contacts.phone': '+998 90 123-45-67',
    'contacts.telegram': 'https://t.me/yaqin_new',
    'contacts.instagram': '@yaqin.new/'
  }))
  assert.deepEqual(res.errors, {})
  assert.equal(res.values['contacts.telegram'], 'yaqin_new')
  assert.equal(res.values['contacts.instagram'], 'yaqin.new')
  res = validateGroupInput(getGroup('contacts'), groupBody('contacts', { 'contacts.phone': 'abc', 'contacts.telegram': 'bad name!' }))
  assert.equal(res.errors['contacts.phone'], 'Телефон в формате +998 90 000 00 00')
  assert.equal(res.errors['contacts.telegram'], 'Только латиница, цифры, точка и _')
})

test('content repo round-trips JSON values', () => {
  const db = openDb(':memory:'); migrate(db)
  saveContent(db, { 'hero.tagline': { ru: 'A', uz: 'B', en: 'C' }, 'contacts.phone': '+998' })
  assert.deepEqual(getStoredContent(db)['hero.tagline'], { ru: 'A', uz: 'B', en: 'C' })
  deleteContent(db, ['contacts.phone'])
  assert.equal(getStoredContent(db)['contacts.phone'], undefined)
})

test('validateGroupInput treats missing body keys as empty', () => {
  let res = validateGroupInput(getGroup('hero'), {})
  assert.equal(res.errors['hero.floor'], 'Заполните текст на русском')
  assert.equal(res.errors['hero.tagline'], 'Заполните текст на русском')
  assert.equal(res.errors['hero.description'], 'Заполните текст на русском')
  assert.equal(res.errors['hero.image'], undefined)
  res = validateGroupInput(getGroup('info'), groupBody('info', { 'info.hoursShort': undefined }))
  assert.equal(res.errors['info.hoursShort'], 'Заполните поле')
})

test('validateGroupInput applies the textarea limit and skips image fields', () => {
  let res = validateGroupInput(getGroup('about'), groupBody('about', { 'about.p1.ru': 'x'.repeat(1000) }))
  assert.deepEqual(res.errors, {})
  res = validateGroupInput(getGroup('about'), groupBody('about', { 'about.p1.ru': 'x'.repeat(1001) }))
  assert.equal(res.errors['about.p1'], 'Не длиннее 1000 символов')
  assert.equal('about.image' in res.values, false)
})

test('localizeContent turns photos into { id } or null', () => {
  const loc = localizeContent(resolveContent({ 'about.image': { image: 'about-1' } }), 'ru')
  assert.deepEqual(loc['about.image'], { id: 'about-1' })
  assert.equal(loc['hero.image'], null)
  assert.equal(loc['contacts.phone'], '+998 90 000 00 00')
})

test('saveContent upserts existing keys and deleteContent drops several', () => {
  const db = openDb(':memory:'); migrate(db)
  saveContent(db, { 'contacts.phone': '+998 1', 'contacts.telegram': 'a', 'hero.image': { image: 'h1' } })
  saveContent(db, { 'contacts.phone': '+998 2' })
  assert.equal(getStoredContent(db)['contacts.phone'], '+998 2')
  deleteContent(db, ['contacts.telegram', 'hero.image'])
  assert.deepEqual(getStoredContent(db), { 'contacts.phone': '+998 2' })
})

test('about features are ordered per feature: title then text', () => {
  assert.deepEqual(getGroup('about').fields.map(f => f.key), [
    'about.title', 'about.p1', 'about.p2', 'about.image',
    'about.f1.title', 'about.f1.text', 'about.f2.title', 'about.f2.text', 'about.f3.title', 'about.f3.text'
  ])
})
