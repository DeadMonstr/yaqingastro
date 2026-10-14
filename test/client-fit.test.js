import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitWithin } from '../public/js/admin-image-input.js'

test('fitWithin scales the long side down to the limit', () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 })
  assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 })
  assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600 })
})

test('fitWithin never returns a zero side', () => {
  assert.deepEqual(fitWithin(10000, 1, 2000), { width: 2000, height: 1 })
})
