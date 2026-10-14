import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createImageStore, ImageError, imageSrcset, imageUrl } from '../src/services/images.js'
import { jpeg } from './helpers/fixtures.js'

const dirs = []
after(() => dirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })))

const store = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-img-'))
  dirs.push(dir)
  const warnings = []
  return { dir, warnings, images: createImageStore({ dir, log: { warn: (...a) => warnings.push(a) } }) }
}

test('save writes one WebP per width', async () => {
  const { dir, images } = store()
  const id = await images.save('dish', await jpeg({ width: 1600, height: 1200 }))
  assert.match(id, /^dish-[0-9a-f-]{36}$/)
  assert.deepEqual(fs.readdirSync(dir).sort(), [`${id}-400.webp`, `${id}-800.webp`])
  const meta = await sharp(path.join(dir, `${id}-800.webp`)).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.width, 800)
})

test('save never upscales', async () => {
  const { dir, images } = store()
  const id = await images.save('dish', await jpeg({ width: 300, height: 200 }))
  assert.equal((await sharp(path.join(dir, `${id}-800.webp`)).metadata()).width, 300)
})

test('save applies EXIF orientation', async () => {
  const { dir, images } = store()
  const id = await images.save('dish', await jpeg({ width: 400, height: 200, orientation: 6 }))
  const meta = await sharp(path.join(dir, `${id}-400.webp`)).metadata()
  assert.ok(meta.height > meta.width)
})

test('save rejects non-images and writes nothing', async () => {
  const { dir, images } = store()
  await assert.rejects(images.save('dish', Buffer.from('not an image')), ImageError)
  assert.deepEqual(fs.readdirSync(dir), [])
})

test('save rejects an unknown kind', async () => {
  const { dir, images } = store()
  await assert.rejects(images.save('logo', await jpeg()), { message: /Unknown image kind/ })
  assert.deepEqual(fs.readdirSync(dir), [])
})

test('save leaves no files behind when writing fails', { skip: process.getuid?.() === 0 }, async t => {
  const { dir, images } = store()
  const buffer = await jpeg()
  fs.chmodSync(dir, 0o500)
  t.after(() => fs.chmodSync(dir, 0o700))
  await assert.rejects(images.save('dish', buffer), err => !(err instanceof ImageError))
  assert.deepEqual(fs.readdirSync(dir), [])
})

test('remove deletes every width and tolerates missing files', async () => {
  const { dir, images, warnings } = store()
  const id = await images.save('hero', await jpeg())
  await images.remove(id)
  assert.deepEqual(fs.readdirSync(dir), [])
  await images.remove(id)
  await images.remove(null)
  assert.deepEqual(warnings, [])
})

test('remove refuses ids that could leave the uploads folder', async () => {
  const { images, warnings } = store()
  await images.remove('dish-../../secret')
  await images.remove('unknown-123')
  assert.equal(warnings.length, 2)
})

test('imageSrcset lists all widths of the kind', () => {
  assert.equal(imageUrl('hero-abc', 1200), '/uploads/hero-abc-1200.webp')
  assert.equal(imageSrcset('hero-abc'), '/uploads/hero-abc-1200.webp 1200w, /uploads/hero-abc-2000.webp 2000w')
})
