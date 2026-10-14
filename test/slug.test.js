import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, uniqueSlug } from '../src/services/slug.js'

test('slugify handles latin, cyrillic and uzbek apostrophes', () => {
  assert.equal(slugify('Coffee & Drinks'), 'coffee-drinks')
  assert.equal(slugify('Выпечка и десерты'), 'vypechka-i-deserty')
  assert.equal(slugify('Пицца'), 'pitstsa')
  assert.equal(slugify('Sho’rvalar'), 'shorvalar')
  assert.equal(slugify('!!!'), 'category')
  assert.equal(slugify('a'.repeat(80)).length, 60)
})

test('uniqueSlug appends the first free number', () => {
  const taken = new Set(['soups', 'soups-2'])
  assert.equal(uniqueSlug('soups', s => taken.has(s)), 'soups-3')
  assert.equal(uniqueSlug('salads', s => taken.has(s)), 'salads')
})
