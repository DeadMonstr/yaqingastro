import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeApp } from './helpers/app.js'
import { saveContent } from '../src/repos/content.js'
import { contactLinks } from '../src/routes/public-common.js'

const app = async t => { const a = await makeApp(); t.after(() => a.close()); return a }

test('home renders in each language', async t => {
  const a = await app(t)
  const r = await a.inject('/uz')
  assert.equal(r.statusCode, 200)
  assert.match(r.body, /<html lang="uz"/)
  assert.match(r.body, /Shunchaki kafedan ko’proq/)
  assert.match((await a.inject('/en')).body, /More than just a cafe/)
})

test('home remembers the language in a cookie', async t => {
  const r = await (await app(t)).inject('/uz')
  const c = r.cookies.find(x => x.name === 'lang')
  assert.equal(c.value, 'uz')
  assert.equal(c.path, '/')
  assert.equal(c.maxAge, 31536000)
})

test('saved content beats defaults and falls back to Russian', async t => {
  const a = await app(t)
  saveContent(a.db, { 'hero.tagline': { ru: 'Новый слоган', uz: '', en: 'New tagline' } })
  assert.match((await a.inject('/ru')).body, /Новый слоган/)
  assert.match((await a.inject('/uz')).body, /Новый слоган/)
  assert.match((await a.inject('/en')).body, /New tagline/)
})

test('contacts and maps are built from content', async t => {
  const body = (await (await app(t)).inject('/ru')).body
  assert.match(body, /href="tel:\+998900000000"/)
  assert.match(body, /href="https:\/\/t\.me\/yaqin_gastro"/)
  assert.match(body, /href="https:\/\/instagram\.com\/yaqin\.gastro"/)
  assert.match(body, /maps\.google\.com\/maps\?q=NRG%20U-Tower%2C%20Tashkent&amp;z=16&amp;output=embed/)
  assert.match(body, /yandex\.uz\/maps\/\?text=NRG%20U-Tower%2C%20Tashkent/)
})

test('the map frame title is localized', async t => {
  const a = await app(t)
  for (const [lang, title] of [['ru', 'Карта'], ['uz', 'Xarita'], ['en', 'Map']]) {
    assert.match((await a.inject(`/${lang}`)).body, new RegExp(`<iframe title="${title}"`), lang)
  }
})

test('hero uses the default photo until one is uploaded', async t => {
  const a = await app(t)
  assert.match((await a.inject('/ru')).body, /\/static\/img\/hero-default\.webp/)
  saveContent(a.db, { 'hero.image': { image: 'hero-abc' } })
  const body = (await a.inject('/ru')).body
  assert.match(body, /\/uploads\/hero-abc-1200\.webp 1200w, \/uploads\/hero-abc-2000\.webp 2000w/)
  assert.match(body, /property="og:image" content="https:\/\/yaqin\.test\/uploads\/hero-abc-1200\.webp"/)
})

test('head links all language versions', async t => {
  const body = (await (await app(t)).inject('/ru')).body
  assert.match(body, /hreflang="uz" href="https:\/\/yaqin\.test\/uz"/)
  assert.match(body, /hreflang="x-default" href="https:\/\/yaqin\.test\/ru"/)
  assert.match(body, /<title>YAQIN Gastro Cafe — Больше, чем просто кафе<\/title>/)
})

test('content from the cabinet is escaped', async t => {
  const a = await app(t)
  saveContent(a.db, { 'hero.tagline': { ru: '<script>alert(1)</script>', uz: '', en: '' } })
  const body = (await a.inject('/ru')).body
  assert.doesNotMatch(body, /<script>alert/)
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('an unknown language is a 404 and sets no cookie', async t => {
  const r = await (await app(t)).inject('/xx')
  assert.equal(r.statusCode, 404)
  assert.equal(r.cookies.length, 0)
})

test('contact links keep only digits and + from the phone', () => {
  const links = contactLinks({
    'contacts.phone': '+998 (90) 123-45-67',
    'contacts.telegram': 'a_b',
    'contacts.instagram': 'a.b',
    'location.mapQuery': 'Café & Bar, Tashkent'
  })
  assert.equal(links.tel, 'tel:+998901234567')
  assert.equal(links.googleMaps, 'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20%26%20Bar%2C%20Tashkent')
})

test('photos not uploaded yet show the branded placeholder, the rest load lazily', async t => {
  const a = await app(t)
  let body = (await a.inject('/ru')).body
  assert.equal((body.match(/<div class="ph" aria-hidden="true">YAQIN<\/div>/g) || []).length, 5)
  assert.match(body, /<img class="hero__bg"[^>]* fetchpriority="high"/)

  saveContent(a.db, { 'gallery.image2': { image: 'gallery-xyz' } })
  body = (await a.inject('/ru')).body
  assert.equal((body.match(/<div class="ph"/g) || []).length, 4)
  assert.match(body, /<img class="photo" src="\/uploads\/gallery-xyz-1400\.webp"[^>]* loading="lazy">/)
})

test('only the error page stretches its main area', async t => {
  const a = await app(t)
  assert.match((await a.inject('/ru')).body, /<main class="site-main">/)
  assert.match((await a.inject('/ru/nope')).body, /<main class="site-main site-main--fill">/)
})
