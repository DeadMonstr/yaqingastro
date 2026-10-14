# Yaqin Gastro — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сайт кафе Yaqin Gastro (главная и меню на трёх языках) по макету и кабинет `/admin`, в котором владелец с телефона ведёт меню и содержимое главной.

**Architecture:** Одно приложение Fastify 5 (ESM) собирает HTML на сервере шаблонами Eta 4 через `@fastify/view`. Данные — SQLite (`better-sqlite3`) в `data/yaqin.db`, фото — WebP в `data/uploads/` (через `sharp`). Слои: `repos/*` (только SQL) → `services/*` (пароли, фото, языки) → `routes/*` (HTTP, проверка данных, выбор шаблона). Клиентский JS — небольшие файлы без сборки.

**Tech Stack:** Node.js ≥ 22, fastify@^5.12, @fastify/view@^12, eta@^4, @fastify/static@^10, @fastify/cookie@^11, @fastify/csrf-protection@^8, @fastify/rate-limit@^11, @fastify/helmet@^13, @fastify/formbody@^9, @fastify/multipart@^10, better-sqlite3@^13, sharp@^0.35. Тесты — `node:test` + `fastify.inject`.

**Spec:** `docs/superpowers/specs/2026-10-14-yaqin-gastro-design.md` — читать вместе с планом. Макеты: `docs/design/home.dc.html`, `docs/design/menu.dc.html` (открываются в браузере через любой статический сервер, например `python3 -m http.server -d docs/design`).

## Global Constraints

- ESM везде (`"type": "module"`), Node.js ≥ 22. Новые runtime-зависимости сверх списка в Tech Stack не добавлять.
- Языки сайта: `ru`, `uz`, `en`; русский — язык по умолчанию и запасной для пустых переводов. Порядок в переключателе: UZ, RU, EN.
- Интерфейс кабинета — только на русском.
- В шаблонах нет inline-скриптов, атрибутов `on*=` и `style="…"`: CSP разрешает скрипты и стили только с нашего домена. Вывод — через `<%= %>` (экранируется); `<%~ %>` — только для `it.body` и `include(...)`.
- Палитра и шрифты — раздел 3 спеки; цвета — CSS-переменные в `:root`.
- CSS пишется mobile-first. Точки перелома: 600 px (сетка блюд), 768 px (навигация кабинета), 920 px (навигация сайта).
- Кнопки и ссылки — не ниже 44 px, фокус виден. `alt` у фото блюда — его название; кнопки без текста подписаны через `aria-label`.
- Цена: целое число сумов от 0 до 100 000 000, вывод с неразрывным пробелом (`95 000`).
- Длины: название категории ≤ 60, название блюда ≤ 120, описание ≤ 500, поля главной `text`/`plain` ≤ 200, `textarea` ≤ 1000. Пароль ≥ 8 символов.
- Загрузка файла ≤ 15 МБ, до 4 файлов в запросе. Вход — не больше 5 попыток в минуту с IP.
- Сессия — 30 дней, cookie `sid` (подписанная, `httpOnly`, `SameSite=Lax`, `path=/admin`, `Secure` в продакшене).
- Ширины фото WebP: `dish` 400/800, `hero` 1200/2000, `about` и `gallery` 800/1400; качество 80.
- Свой JS сайта (`site.js` + `menu.js`) — не больше 10 КБ вместе.
- Тексты макета копируются дословно, с типографским апострофом `’` в узбекском.
- Каждая задача заканчивается зелёным `npm test` и коммитом.

## Review Focus

1. Владелец удалил все категории и перезапустил сервер — демо-меню из макета не должно появиться снова (seed только для только что созданной базы). Тест — в задаче 7.
2. Цену набрали с телефона с пробелом или вставили `95 000` с неразрывным пробелом — сохраняется 95000, а не ошибка. Тест — в задаче 12.
3. Фото не читается (HEIC, который браузер не пересжал, или не картинка) — понятная ошибка на русском, блюдо не создано, в `uploads/` не осталось файлов. Тест — в задаче 12.
4. В cookie `lang` мусор (`de`, пусто) — `/` ведёт на `/ru`, а не на 404. Тест — в задаче 7.
5. Группа главной не прошла проверку, но в ней было выбрано фото — ничего не сохранено и файлы не записаны. Тест — в задаче 13.

---

## Карта файлов

```
package.json, .gitignore, .dockerignore, .env.example, Dockerfile, docker-compose.yml, Caddyfile.example, README.md
src/
  server.js                 — запуск (задача 7)
  app.js                    — buildApp(config) (задача 7)
  config.js                 — loadConfig(env) (задача 1)
  content-schema.js         — поля главной, значения по умолчанию, проверка (задача 4)
  db/index.js               — openDb, migrate (задача 1)
  db/migrations/001_init.sql
  db/seed.js, db/seed-data.js — seedMenu (задача 7)
  i18n/ui.js                — словарь интерфейса (задача 2)
  repos/categories.js, dishes.js, menu.js (задача 3), content.js (задача 4), users.js, sessions.js (задача 5)
  services/i18n.js, slug.js (задача 2), auth.js (задача 5), images.js (задача 6)
  routes/public-common.js   — общие данные страниц сайта (задача 7)
  routes/public.js          — `/`, `/:lang`, `/:lang/menu`, robots, sitemap (задачи 7–9)
  routes/admin/index.js     — плагин кабинета: сессия, CSRF, ошибки (задача 10)
  routes/admin/auth.js, account.js (задача 10), menu.js (задача 11), categories.js, dishes.js, forms.js (задача 12), home.js (задача 13)
  views/public/             — layout, partials/header, partials/footer, home, menu, error (задачи 7–9)
  views/admin/              — layout, login, error, account (задача 10), menu (11), category-form, dish-form, partials/lang-tabs (12), home (13)
public/
  css/fonts.css, css/site.css (задачи 7–9), css/admin.css (задачи 10–13)
  js/site.js (8), js/menu.js (9), js/admin.js (10), js/admin-menu.js (11), js/admin-lang-tabs.js, js/admin-image-input.js (12)
  vendor/sortable.min.js (11), fonts/*.woff2 (7), img/hero-default.webp, img/favicon.svg (7), img/icon-192.png, img/icon-512.png (10)
  admin.webmanifest (10)
scripts/backup.js, scripts/set-password.js, scripts/make-icons.js (задачи 10, 14)
test/
  helpers/app.js (7), helpers/fixtures.js (6), helpers/admin.js (10, 12)
  *.test.js — по задачам
```

---

### Task 1: Каркас проекта, конфигурация, база и миграции

**Files:**
- Create: `package.json`, `src/config.js`, `src/db/index.js`, `src/db/migrations/001_init.sql`
- Modify: `.gitignore`
- Test: `test/config.test.js`, `test/db.test.js`

**Interfaces:**
- Produces:
  - `loadConfig(env = process.env) → Config`, где `Config = { env, isProd, host, port, publicUrl, dataDir, dbFile, uploadsDir, backupsDir, sessionSecret, adminLogin, adminPassword, trustProxy, logger }`.
  - `openDb(file: string) → Database` (better-sqlite3; `':memory:'` допустим).
  - `migrate(db) → { from: number, to: number }` — номера версий до и после.

- [ ] **Step 1: Создать `package.json` и поставить зависимости**

`package.json` до установки зависимостей:

```json
{
  "name": "yaqin-gastro",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test \"test/**/*.test.js\"",
    "backup": "node scripts/backup.js",
    "set-password": "node scripts/set-password.js"
  }
}
```

```bash
npm i fastify@^5.12 @fastify/view@^12 eta@^4 @fastify/static@^10 @fastify/cookie@^11 \
  @fastify/csrf-protection@^8 @fastify/rate-limit@^11 @fastify/helmet@^13 @fastify/formbody@^9 \
  @fastify/multipart@^10 better-sqlite3@^13 sharp@^0.35
```

В `.gitignore` уже есть `node_modules/`, `data/`, `.env` — проверить.

- [ ] **Step 2: Написать падающие тесты**

```js
// test/config.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { loadConfig } from '../src/config.js'

test('loadConfig fills defaults', () => {
  const c = loadConfig({})
  assert.equal(c.env, 'development')
  assert.equal(c.isProd, false)
  assert.equal(c.host, '0.0.0.0')
  assert.equal(c.port, 3000)
  assert.equal(c.publicUrl, 'http://localhost:3000')
  assert.equal(c.dbFile, path.resolve('data/yaqin.db'))
  assert.equal(c.uploadsDir, path.resolve('data/uploads'))
  assert.equal(c.backupsDir, path.resolve('data/backups'))
  assert.equal(c.trustProxy, false)
  assert.equal(c.adminLogin, null)
  assert.ok(c.sessionSecret.length >= 32)
})

test('loadConfig requires SESSION_SECRET in production', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /SESSION_SECRET/)
})

test('loadConfig strips trailing slash from PUBLIC_URL and reads TRUST_PROXY', () => {
  const c = loadConfig({ PUBLIC_URL: 'https://yaqin.uz/', TRUST_PROXY: 'true', DATA_DIR: '/srv/data' })
  assert.equal(c.publicUrl, 'https://yaqin.uz')
  assert.equal(c.trustProxy, true)
  assert.equal(c.dbFile, '/srv/data/yaqin.db')
})
```

```js
// test/db.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDb, migrate } from '../src/db/index.js'

test('migrate creates schema on a fresh database', () => {
  const db = openDb(':memory:')
  assert.deepEqual(migrate(db), { from: 0, to: 1 })
  assert.equal(db.pragma('user_version', { simple: true }), 1)
  const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all().map(r => r.name)
  assert.deepEqual(tables, ['categories', 'content', 'dishes', 'sessions', 'users'])
})

test('migrate is idempotent', () => {
  const db = openDb(':memory:')
  migrate(db)
  assert.deepEqual(migrate(db), { from: 1, to: 1 })
})

test('foreign keys are enforced', () => {
  const db = openDb(':memory:')
  migrate(db)
  assert.throws(
    () => db.prepare("insert into dishes (category_id, name_ru, price, sort_order) values (99, 'x', 1, 1)").run(),
    /FOREIGN KEY/
  )
})

test('openDb creates the parent directory of a file database', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-'))
  const db = openDb(path.join(dir, 'nested', 'yaqin.db'))
  migrate(db)
  db.close()
  assert.ok(fs.existsSync(path.join(dir, 'nested', 'yaqin.db')))
})
```

- [ ] **Step 3: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/config.js'`.

- [ ] **Step 4: Реализовать `src/config.js`, `src/db/index.js`, `001_init.sql`**

- `loadConfig`: значения и имена переменных — раздел 13 спеки. `dataDir = path.resolve(env.DATA_DIR ?? './data')`, `dbFile`, `uploadsDir`, `backupsDir` — внутри `dataDir`. В не-продакшене без `SESSION_SECRET` — постоянная строка `'dev-only-secret-change-me-0123456789'`. `logger: env.NODE_ENV !== 'test'`.
- `openDb`: для файла — `fs.mkdirSync(dirname, { recursive: true })`; pragma `journal_mode = WAL` (только для файла), `foreign_keys = ON`, `busy_timeout = 5000`.
- `migrate`: читает `src/db/migrations/*.sql` (путь от `import.meta.dirname`), сортирует по числовому префиксу, применяет файлы с номером больше `user_version`, каждый в транзакции вместе с `PRAGMA user_version = N`.
- `001_init.sql` — SQL из раздела 5 спеки без изменений.

- [ ] **Step 5: Запустить — должны пройти**

Run: `npm test`
Expected: PASS, 7 тестов.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore src test
git commit -m "feat: project skeleton, config, sqlite migrations"
```

---

### Task 2: Языки, словарь интерфейса, slug

**Files:**
- Create: `src/services/i18n.js`, `src/i18n/ui.js`, `src/services/slug.js`
- Test: `test/i18n.test.js`, `test/slug.test.js`

**Interfaces:**
- Produces:
  - `LANGS = ['ru', 'uz', 'en']`, `SWITCHER_ORDER = ['uz', 'ru', 'en']`, `DEFAULT_LANG = 'ru'`
  - `isLang(value: unknown) → boolean`
  - `tr(value: {ru, uz, en} | string | null | undefined, lang) → string` — строка как есть; объект — значение языка, если после `trim()` не пусто, иначе `ru`; иначе `''`.
  - `pick(row, field, lang) → string` — `row[field + '_' + lang]` или `row[field + '_ru']`.
  - `formatPrice(n: number) → string` — разряды через ` `.
  - `UI: Record<lang, UiDict>` — ключи ниже.
  - `slugify(text: string) → string`, `uniqueSlug(base: string, isTaken: (slug) => boolean) → string`.

- [ ] **Step 1: Написать падающие тесты**

```js
// test/i18n.test.js
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
```

```js
// test/slug.test.js
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
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `src/services/i18n.js`**

По Interfaces. `formatPrice` — регулярка `/\B(?=(\d{3})+(?!\d))/g` с заменой на ` ` (как `fmt` в `menu.dc.html:211`).

- [ ] **Step 4: Реализовать `src/i18n/ui.js`**

`export const UI = { ru: {...}, uz: {...}, en: {...} }`. Ключи и откуда брать текст:

| Ключ | Источник |
|---|---|
| `nav.about`, `nav.gallery`, `nav.contact`, `nav.location`, `nav.menu` | `T.*.nav` в `docs/design/home.dc.html:276-358` |
| `nav.home` | первый элемент `T.*.nav` в `docs/design/menu.dc.html:166-170` («Главная» / «Bosh sahifa» / «Home») |
| `ctaMenu`, `ctaOrder`, `hoursLabel`, `addrLabel`, `aboutEyebrow`, `galleryEyebrow`, `orderEyebrow`, `orderTg`, `orderCall`, `contactEyebrow`, `cPhone`, `cHours`, `cPhoneHint`, `cTgHint`, `cIgHint`, `cHoursHint`, `locEyebrow`, `mapYandex` | одноимённые ключи `T` в `home.dc.html` |
| `menuTitle`, `menuNote`, `cur` | `title`, `note`, `cur` из `T` в `menu.dc.html` |
| `units.g`, `units.ml` | `g`, `ml` из `T` в `menu.dc.html` |
| `units.pcs` | `шт` / `dona` / `pcs` |
| `close` | `Закрыть` / `Yopish` / `Close` |
| `notFoundTitle` | `Страница не найдена` / `Sahifa topilmadi` / `Page not found` |
| `notFoundText` | `Возможно, ссылка устарела.` / `Ehtimol, havola eskirgan.` / `The link may be outdated.` |
| `errorTitle` | `Что-то пошло не так` / `Nimadir xato ketdi` / `Something went wrong` |
| `errorText` | `Попробуйте обновить страницу через минуту.` / `Bir daqiqadan so’ng sahifani yangilang.` / `Please refresh the page in a minute.` |
| `backHome` | `На главную` / `Bosh sahifaga` / `Back to home` |

- [ ] **Step 5: Реализовать `src/services/slug.js`**

`slugify`: `toLowerCase()`, транслитерация кириллицы (таблица ниже, плюс узбекские `ў→o`, `қ→q`, `ғ→g`, `ҳ→h`), удалить апострофы `’ ‘ ' ʻ ʼ \``, всё, что не `[a-z0-9]`, → `-`, схлопнуть повторы, обрезать `-` по краям, обрезать до 60 символов (и снова убрать `-` в конце); пустой результат → `'category'`.

```
а a  б b  в v  г g  д d  е e  ё yo  ж zh  з z  и i  й y  к k  л l  м m  н n  о o  п p  р r  с s  т t
у u  ф f  х kh  ц ts  ч ch  ш sh  щ shch  ъ —  ы y  ь —  э e  ю yu  я ya
```

- [ ] **Step 6: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src test
git commit -m "feat: i18n helpers, UI dictionary, slugify"
```

---

### Task 3: Репозитории меню

**Files:**
- Create: `src/repos/categories.js`, `src/repos/dishes.js`, `src/repos/menu.js`
- Test: `test/repos-menu.test.js`

**Interfaces:**
- Consumes: `openDb`, `migrate` (задача 1).
- Produces (все функции синхронные, первым аргументом `db`):
  - `Category = { id, slug, name_ru, name_uz, name_en, sort_order, is_visible: boolean, created_at, updated_at }`
  - `Dish = { id, category_id, name_ru, name_uz, name_en, desc_ru, desc_uz, desc_en, amount: number|null, unit: 'g'|'ml'|'pcs'|null, price, image: string|null, sort_order, is_visible: boolean, created_at, updated_at }`
  - `CategoryInput = { slug, name_ru, name_uz, name_en, is_visible: boolean }`
  - `DishInput = { category_id, name_ru, name_uz, name_en, desc_ru, desc_uz, desc_en, amount, unit, price, image, is_visible: boolean }`
  - `categories.js`: `listCategories(db) → Category[]`, `getCategory(db, id) → Category|undefined`, `isSlugTaken(db, slug, exceptId = null) → boolean`, `createCategory(db, input) → Category`, `updateCategory(db, id, input) → Category|undefined`, `deleteCategory(db, id) → 'deleted'|'not_empty'|'not_found'`, `setCategoryVisible(db, id, visible) → boolean`, `reorderCategories(db, ids: number[]) → boolean`
  - `dishes.js`: `listDishes(db, categoryId) → Dish[]`, `getDish(db, id) → Dish|undefined`, `countDishes(db, categoryId) → number`, `createDish(db, input) → Dish`, `updateDish(db, id, input) → Dish|undefined`, `deleteDish(db, id) → Dish|undefined` (возвращает удалённую строку), `setDishVisible(db, id, visible) → boolean`, `reorderDishes(db, categoryId, ids) → boolean`
  - `menu.js`: `getAdminMenu(db) → Array<Category & { dishes: Dish[] }>` (всё), `getPublicMenu(db) → Array<Category & { dishes: Dish[] }>` (только видимое, без пустых категорий)

- [ ] **Step 1: Написать падающие тесты**

```js
// test/repos-menu.test.js
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
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать три модуля**

- `is_visible` хранится как 0/1, наружу — `boolean`; на вход принимается `boolean`.
- `sort_order` новой строки — `coalesce(max(sort_order), 0) + 1` в своей области (все категории / блюда категории).
- `updated_at = datetime('now')` при каждом изменении.
- `reorder*`: сравнить множество `ids` с множеством id области (длина и состав), при несовпадении — `false`; иначе в транзакции проставить `sort_order = index + 1`.
- `deleteCategory`: сначала `getCategory` (нет → `'not_found'`), затем `countDishes > 0` → `'not_empty'`.
- `getPublicMenu`: категории `is_visible = 1` по `sort_order`, к каждой — блюда `is_visible = 1` по `sort_order`; категории без блюд отбросить.

- [ ] **Step 4: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat: category, dish and menu repositories"
```

---

### Task 4: Схема содержимого главной и репозиторий контента

**Files:**
- Create: `src/content-schema.js`, `src/repos/content.js`
- Test: `test/content.test.js`

**Interfaces:**
- Consumes: `tr` (задача 2).
- Produces (для фото `localizeContent` в этой задаче возвращает `{ id }`; `src` и `srcset` добавляет задача 8):
  - `CONTENT_SCHEMA: Group[]`, `Group = { id, title, fields: Field[] }`, `Field = { key, type: 'text'|'textarea'|'plain'|'phone'|'username'|'image', translatable: boolean, label: string, default?: {ru,uz,en}|string, imageKind?: 'hero'|'about'|'gallery' }`
  - `getGroup(id) → Group|undefined`
  - `resolveContent(stored: Record<string, any>) → Record<string, any>` — для каждого поля: сохранённое значение или `default`; поле-фото → `string` (id) или `null`.
  - `validateGroupInput(group, body) → { values: Record<string, any>, errors: Record<string, string> }` — только не-фото поля; ключи тела: `<key>.<lang>` для переводимых, `<key>` для остальных; `values` готовы для `saveContent`.
  - `localizeContent(resolved, lang) → Record<string, string | { id: string } | null>`
  - `repos/content.js`: `getStoredContent(db) → Record<string, any>`, `saveContent(db, values: Record<string, any>) → void` (upsert всех ключей в одной транзакции), `deleteContent(db, keys: string[]) → void`

- [ ] **Step 1: Написать падающие тесты**

```js
// test/content.test.js
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
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать `src/content-schema.js`**

- Группы, ключи, типы и признак перевода — таблица раздела 6 спеки, в её порядке. Заголовки групп: `Первый экран`, `Часы и адрес`, `О нас`, `Атмосфера`, `Онлайн-заказ`, `Контакты`, `Как добраться`. Подписи полей — короткие русские («Слоган», «Описание», «Фото»…).
- `imageKind`: `hero.image` → `hero`, `about.image` → `about`, `gallery.image1..4` → `gallery`.
- Значения по умолчанию — дословно из `T` в `docs/design/home.dc.html:276-358`: `hero.floor`←`floor`, `hero.tagline`←`tagline`, `hero.description`←`heroDesc`, `info.hours`←`hours`, `info.addressShort`←`addrShort`, `info.addressFull`←`locAddr`, `about.title`←`aboutTitle`, `about.p1`←`aboutP1`, `about.p2`←`aboutP2`, `about.fN.title/text`←`features[N-1]`, `gallery.title`←`galleryTitle`, `gallery.description`←`galleryDesc`, `order.title`←`orderTitle`, `order.description`←`orderDesc`, `location.title`←`locTitle`. Непереводимые: `info.hoursShort` = `'08:00 – 23:00'`, `contacts.phone` = `'+998 90 000 00 00'`, `contacts.telegram` = `'yaqin_gastro'`, `contacts.instagram` = `'yaqin.gastro'`, `location.mapQuery` = `'NRG U-Tower, Tashkent'`.
- Проверка (тексты ошибок — точно как в тестах): все значения `trim()`; переводимое — `ru` обязателен (`Заполните текст на русском`); длина — `text`/`plain`/`phone`/`username` ≤ 200, `textarea` ≤ 1000 (`Не длиннее N символов`); `plain` обязателен (`Заполните поле`); `phone` — `^\+?[0-9 ()-]{7,20}$`; `username` — убрать `https://…/`, `@`, завершающий `/`, затем `^[A-Za-z0-9._]{1,32}$` (`Только латиница, цифры, точка и _`).
- Ошибка переводимого поля пишется под ключом поля без языка (`errors['hero.tagline']`).

- [ ] **Step 4: Реализовать `src/repos/content.js`**

`value` хранится как `JSON.stringify`; `saveContent` — `INSERT … ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`.

- [ ] **Step 5: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src test
git commit -m "feat: home content schema, validation and repository"
```

---

### Task 5: Пароли, сессии, первый администратор

**Files:**
- Create: `src/services/auth.js`, `src/repos/users.js`, `src/repos/sessions.js`
- Test: `test/auth.test.js`

**Interfaces:**
- Produces:
  - `services/auth.js`: `hashPassword(plain) → Promise<string>` (формат `scrypt$<salt hex 16 байт>$<hash hex 64 байта>`), `verifyPassword(plain, stored) → Promise<boolean>` (на испорченной строке — `false`), `SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000`, `ensureAdmin(db, { adminLogin, adminPassword }, log) → Promise<'created'|'exists'|'missing'>`
  - `repos/users.js`: `User = { id, login, password_hash, created_at }`; `countUsers(db) → number`, `findUserByLogin(db, login) → User|undefined`, `getUser(db, id) → User|undefined`, `createUser(db, login, passwordHash) → User`, `setPasswordHash(db, id, hash) → void`
  - `repos/sessions.js`: `createSession(db, userId, now = new Date()) → { id, expires_at }` (id — `randomBytes(32).toString('hex')`, `expires_at` — ISO-строка `now + SESSION_TTL_MS`), `findSessionUser(db, id, now = new Date()) → User|undefined`, `deleteSession(db, id)`, `deleteOtherSessions(db, userId, keepId)`, `deleteAllSessions(db, userId)`, `deleteExpiredSessions(db, now = new Date()) → number`

- [ ] **Step 1: Написать падающие тесты**

```js
// test/auth.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb, migrate } from '../src/db/index.js'
import { hashPassword, verifyPassword, ensureAdmin } from '../src/services/auth.js'
import { createUser, countUsers, findUserByLogin } from '../src/repos/users.js'
import * as S from '../src/repos/sessions.js'

const fresh = () => { const db = openDb(':memory:'); migrate(db); return db }
const day = 24 * 60 * 60 * 1000
const silent = { warn() {}, info() {} }

test('hashPassword and verifyPassword round-trip', async () => {
  const h1 = await hashPassword('secret-pass-1'), h2 = await hashPassword('secret-pass-1')
  assert.match(h1, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
  assert.notEqual(h1, h2)
  assert.equal(await verifyPassword('secret-pass-1', h1), true)
  assert.equal(await verifyPassword('wrong', h1), false)
  assert.equal(await verifyPassword('x', 'garbage'), false)
})

test('sessions expire after 30 days', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h'), t0 = new Date('2026-01-01T00:00:00Z')
  const s = S.createSession(db, u.id, t0)
  assert.equal(S.findSessionUser(db, s.id, new Date(t0.getTime() + 29 * day)).login, 'admin')
  assert.equal(S.findSessionUser(db, s.id, new Date(t0.getTime() + 31 * day)), undefined)
  assert.equal(S.deleteExpiredSessions(db, new Date(t0.getTime() + 31 * day)), 1)
})

test('deleteOtherSessions keeps the current one', () => {
  const db = fresh(), u = createUser(db, 'admin', 'h')
  const a = S.createSession(db, u.id), b = S.createSession(db, u.id)
  S.deleteOtherSessions(db, u.id, a.id)
  assert.ok(S.findSessionUser(db, a.id))
  assert.equal(S.findSessionUser(db, b.id), undefined)
})

test('ensureAdmin creates the first admin only once', async () => {
  const db = fresh()
  assert.equal(await ensureAdmin(db, { adminLogin: null, adminPassword: null }, silent), 'missing')
  assert.equal(await ensureAdmin(db, { adminLogin: 'admin', adminPassword: 'secret-pass-1' }, silent), 'created')
  assert.equal(await ensureAdmin(db, { adminLogin: 'other', adminPassword: 'x' }, silent), 'exists')
  assert.equal(countUsers(db), 1)
  assert.equal(await verifyPassword('secret-pass-1', findUserByLogin(db, 'admin').password_hash), true)
})
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать три модуля**

- `scrypt` — `node:crypto` (промисифицировать), `keylen` 64, параметры по умолчанию; сравнение — `timingSafeEqual`.
- `expires_at` сравнивается ISO-строкой, переданной из JS (`expires_at > ?`), а не через `datetime('now')`: форматы различаются.
- `ensureAdmin`: если `countUsers > 0` → `'exists'`; нет логина или пароля → `log.warn('No admin user: set ADMIN_LOGIN and ADMIN_PASSWORD')` и `'missing'`; иначе создать.

- [ ] **Step 4: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat: password hashing, sessions, first admin"
```

---

### Task 6: Сервис фото

**Files:**
- Create: `src/services/images.js`, `test/helpers/fixtures.js`
- Test: `test/images.test.js`

**Interfaces:**
- Produces:
  - `IMAGE_WIDTHS = { dish: [400, 800], hero: [1200, 2000], about: [800, 1400], gallery: [800, 1400] }`
  - `class ImageError extends Error` — сообщение `'Не удалось прочитать фото, сохраните его как JPEG или PNG'`
  - `imageKind(id) → string` (префикс до первого `-`), `imageUrl(id, width) → '/uploads/<id>-<width>.webp'`, `imageSrcset(id) → '<url> <w>w, …'`
  - `createImageStore({ dir, log }) → { save(kind, buffer: Buffer) → Promise<string>, remove(id: string|null) → Promise<void> }`
  - `test/helpers/fixtures.js`: `jpeg({ width = 1200, height = 900, orientation } = {}) → Promise<Buffer>`

- [ ] **Step 1: Написать фикстуру и падающие тесты**

`jpeg()` — `sharp({ create: { width, height, channels: 3, background: '#c9a96e' } }).jpeg()`, при `orientation` — `.withMetadata({ orientation })`, `.toBuffer()`.

```js
// test/images.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createImageStore, ImageError, imageSrcset, imageUrl } from '../src/services/images.js'
import { jpeg } from './helpers/fixtures.js'

const store = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-img-'))
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

test('remove deletes every width and tolerates missing files', async () => {
  const { dir, images, warnings } = store()
  const id = await images.save('hero', await jpeg())
  await images.remove(id)
  assert.deepEqual(fs.readdirSync(dir), [])
  await images.remove(id)
  await images.remove(null)
  assert.deepEqual(warnings, [])
})

test('imageSrcset lists all widths of the kind', () => {
  assert.equal(imageUrl('hero-abc', 1200), '/uploads/hero-abc-1200.webp')
  assert.equal(imageSrcset('hero-abc'), '/uploads/hero-abc-1200.webp 1200w, /uploads/hero-abc-2000.webp 2000w')
})
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать `src/services/images.js`**

- `save`: неизвестный `kind` → `Error`; `sharp(buffer).metadata()` бросает → `ImageError`; `id = kind + '-' + randomUUID()`; для каждой ширины — `sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(...)`; при ошибке записи — удалить уже записанные файлы этого `id` и пробросить ошибку. Папку создать при создании стора (`mkdirSync recursive`).
- `remove`: `null` → ничего; `unlink` каждой ширины, `ENOENT` игнорировать, прочие ошибки — `log.warn` и не бросать.

- [ ] **Step 4: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat: image store with WebP variants"
```

---

### Task 7: Сборка приложения, seed, каркас сайта, 404/500, robots, sitemap

**Files:**
- Create: `src/app.js`, `src/server.js`, `src/db/seed.js`, `src/db/seed-data.js`, `src/routes/public-common.js`, `src/routes/public.js`, `src/views/public/layout.eta`, `src/views/public/partials/header.eta`, `src/views/public/partials/footer.eta`, `src/views/public/error.eta`, `public/css/fonts.css`, `public/css/site.css`, `public/fonts/*.woff2`, `public/img/hero-default.webp`, `public/img/favicon.svg`, `test/helpers/app.js`
- Test: `test/app.test.js`

**Interfaces:**
- Consumes: всё из задач 1–6.
- Produces:
  - `buildApp(config) → Promise<FastifyInstance>` — **без** `app.ready()`, чтобы тесты могли добавить маршрут. Декорации: `app.db`, `app.config`, `app.images` (стор из задачи 6).
  - `seedMenu(db) → void` — 5 категорий и 24 блюда из `SEED_MENU`.
  - `commonData(config, lang, path: '' | '/menu' | null) → { lang, ui, langLinks, nav, cta, homeHref, year, meta: { canonical, alternates } }` в `src/routes/public-common.js`:
    - `langLinks`: `[{ code, label: 'UZ'|'RU'|'EN', href: '/<code><path>', active }]` в порядке UZ, RU, EN (`path === null` → `'/<code>'`);
    - `path === ''` (главная): `nav` — якоря `#about`, `#gallery`, `#contact`, `#location` с подписями `ui.nav.*`, `cta = { label: ui.nav.menu, href: '/<lang>/menu' }`;
    - иначе: `nav` — `ui.nav.home` → `/<lang>`, `ui.nav.about` → `/<lang>#about`, `ui.nav.contact` → `/<lang>#contact`, `ui.nav.location` → `/<lang>#location`; `cta = { label: ui.ctaOrder, href: '/<lang>#order' }`;
    - `meta.alternates`: `[{ hreflang, href: publicUrl + '/' + code + path }]` для трёх языков и `x-default` → русская версия; `meta.canonical` — адрес текущего языка.
  - Шаблоны сайта получают `it` = `commonData(...)` + данные страницы; `it.meta` дополняется `title`, `description`, `ogImage` (абсолютный URL или `null`).
  - `test/helpers/app.js`: `testConfig(overrides = {}) → Config` (`env: 'test'`, `logger: false`, `dbFile: ':memory:'`, временный `dataDir` с `uploadsDir`/`backupsDir` внутри, `publicUrl: 'https://yaqin.test'`, `sessionSecret: 'test-secret-0123456789abcdef0123456789'`, `adminLogin: 'admin'`, `adminPassword: 'secret-pass-1'`), `makeApp(overrides = {}) → Promise<FastifyInstance>`.

- [ ] **Step 1: Перенести статические ресурсы**

```bash
mkdir -p public/fonts public/img public/css public/js
cp docs/design/hero-default.webp public/img/hero-default.webp
npm i --no-save @fontsource/cormorant-garamond@^5 @fontsource-variable/manrope@^5
for s in latin cyrillic; do
  for v in 500-normal 500-italic 600-normal; do cp node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-$s-$v.woff2 public/fonts/; done
  cp node_modules/@fontsource-variable/manrope/files/manrope-$s-wght-normal.woff2 public/fonts/
done
```

`public/css/fonts.css` — `@font-face` для каждого файла, `font-display: swap`, `unicode-range` из fontsource: latin — `U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD`, cyrillic — `U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116`. Manrope — `font-weight: 200 800`.
`public/img/favicon.svg` — квадрат `#0F241A`, буква «Y» цветом `#E2C99A` шрифтом `Georgia, serif`.

- [ ] **Step 2: Написать `test/helpers/app.js` и падающие тесты**

```js
// test/app.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { makeApp, testConfig } from './helpers/app.js'
import { buildApp } from '../src/app.js'

const app = async (t, o) => { const a = await makeApp(o); t.after(() => a.close()); return a }

test('GET / redirects to /ru by default', async t => {
  const r = await (await app(t)).inject('/')
  assert.equal(r.statusCode, 302)
  assert.equal(r.headers.location, '/ru')
})

test('GET / follows the lang cookie and ignores unknown values', async t => {
  const a = await app(t)
  assert.equal((await a.inject({ url: '/', cookies: { lang: 'en' } })).headers.location, '/en')
  assert.equal((await a.inject({ url: '/', cookies: { lang: 'de' } })).headers.location, '/ru')
})

test('unknown pages render the 404 page in the right language', async t => {
  const a = await app(t)
  let r = await a.inject('/en/nope')
  assert.equal(r.statusCode, 404)
  assert.match(r.body, /Page not found/)
  r = await a.inject('/xx')
  assert.equal(r.statusCode, 404)
  assert.match(r.body, /Страница не найдена/)
  assert.match(r.body, /<html lang="ru"/)
})

test('unexpected errors render the 500 page without details', async t => {
  const a = await makeApp()
  t.after(() => a.close())
  a.get('/uz/boom', async () => { throw new Error('secret detail') })
  const r = await a.inject('/uz/boom')
  assert.equal(r.statusCode, 500)
  assert.match(r.body, /Nimadir xato ketdi/)
  assert.doesNotMatch(r.body, /secret detail/)
})

test('robots.txt hides /admin and points to the sitemap', async t => {
  const r = await (await app(t)).inject('/robots.txt')
  assert.match(r.body, /Disallow: \/admin/)
  assert.match(r.body, /Sitemap: https:\/\/yaqin\.test\/sitemap\.xml/)
})

test('sitemap lists home and menu in three languages', async t => {
  const r = await (await app(t)).inject('/sitemap.xml')
  assert.equal((r.body.match(/<loc>/g) || []).length, 6)
  assert.match(r.body, /<loc>https:\/\/yaqin\.test\/uz\/menu<\/loc>/)
})

test('security headers forbid inline scripts', async t => {
  const r = await (await app(t)).inject('/robots.txt')
  const csp = r.headers['content-security-policy']
  assert.match(csp, /script-src 'self'/)
  assert.match(csp, /frame-src https:\/\/www\.google\.com https:\/\/maps\.google\.com/)
  assert.doesNotMatch(csp, /unsafe-inline/)
})

test('static files are cached for 7 days', async t => {
  const r = await (await app(t)).inject('/static/css/site.css')
  assert.equal(r.statusCode, 200)
  assert.match(r.headers['cache-control'], /max-age=604800/)
})

test('a fresh database gets the mockup menu', async t => {
  const a = await app(t)
  assert.equal(a.db.prepare('select count(*) n from categories').get().n, 5)
  assert.equal(a.db.prepare('select count(*) n from dishes').get().n, 24)
})

test('the menu is not re-seeded after the owner empties it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-seed-'))
  const cfg = testConfig({ dataDir: dir, dbFile: path.join(dir, 'yaqin.db'), uploadsDir: path.join(dir, 'uploads') })
  let a = await buildApp(cfg)
  a.db.exec('delete from dishes; delete from categories')
  await a.close()
  a = await buildApp(cfg)
  assert.equal(a.db.prepare('select count(*) n from categories').get().n, 0)
  await a.close()
})
```

- [ ] **Step 3: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/app.js'`.

- [ ] **Step 4: Реализовать seed**

- `src/db/seed-data.js`: `export const SEED_MENU = [{ slug, name: { ru, uz, en }, dishes: [{ name: { ru, uz, en }, desc: { ru, uz, en }, amount, unit, price }] }]` — дословно из `CATS` в `docs/design/menu.dc.html:174-209` (slug = `id` категории; формат строки описан в комментарии на строке 173).
- `src/db/seed.js`: `seedMenu(db)` — одна транзакция, через `createCategory`/`createDish`, всё видимое, без фото.

- [ ] **Step 5: Реализовать `src/app.js` и `src/server.js`**

Порядок в `buildApp(config)`:
1. `Fastify({ logger: config.logger, trustProxy: config.trustProxy })`.
2. `db = openDb(config.dbFile)`; `const { from } = migrate(db)`; `if (from === 0) seedMenu(db)` — seed только для только что созданной базы; `await ensureAdmin(db, config, app.log)`; `deleteExpiredSessions(db)`. Хук `onClose` → `db.close()`.
3. Декорации `db`, `config`, `images` (`createImageStore({ dir: config.uploadsDir, log: app.log })`).
4. Плагины: `@fastify/helmet` с `contentSecurityPolicy: { useDefaults: false, directives }` — директивы из раздела 10 спеки плюс `base-uri 'self'` и `object-src 'none'`; `@fastify/cookie` (`secret: config.sessionSecret`); `@fastify/formbody`; `@fastify/multipart` (`attachFieldsToBody: 'keyValues'`, `limits: { fileSize: 15 * 1024 * 1024, files: 4 }` — файлы приходят как `Buffer`, пустой `<input type=file>` даёт `Buffer` длины 0); `@fastify/rate-limit` (`global: false`); `@fastify/view` (`engine: { eta: new Eta({ views: <src/views>, autoEscape: true, cache: config.isProd }) }`, `root: <src/views>`, `viewExt: 'eta'`); `@fastify/static` для `public/` (`prefix: '/static/'`, `maxAge: '7d'`) и для `uploadsDir` (`prefix: '/uploads/'`, `decorateReply: false`, `maxAge: '365d'`, `immutable: true`).
5. Маршруты: `routes/public.js`. (Кабинет подключается в задаче 10.)
6. `setNotFoundHandler` и `setErrorHandler` на корне. Язык — первый сегмент пути, если это язык, иначе `ru`. Шаблон `public/error`, ссылка `ui.backHome`:
   - не найдено — код 404, `ui.notFoundTitle` и `ui.notFoundText`;
   - ошибка с `statusCode` от 400 до 499 — её код, `ui.errorTitle` и `ui.errorText`;
   - всё остальное — `request.log.error(err)`, код 500, `ui.errorTitle` и `ui.errorText`. Текст ошибки наружу не попадает.

`src/server.js`: `loadConfig()` → `buildApp` → `listen({ host, port })`.

- [ ] **Step 6: Реализовать маршруты и каркас сайта**

`src/routes/public.js` (в этой задаче): `GET /` — 302 на `/<lang>` (`request.cookies.lang`, если `isLang`, иначе `ru`); `GET /robots.txt` (3 строки: `User-agent: *`, `Disallow: /admin`, `Sitemap: <publicUrl>/sitemap.xml`); `GET /sitemap.xml` (`application/xml`, 6 `<url><loc>`).

Шаблоны (Eta 4, layout — `<% layout('./layout') %>` в первой строке страницы, в layout — `<%~ it.body %>`; `it` передаётся в layout автоматически):
- `layout.eta`: `<html lang="<%= it.lang %>">`, `<title>`, `meta description`, `link rel=canonical`, `hreflang`-ссылки, Open Graph (если `it.meta.ogImage`), `favicon.svg`, `preload` для `manrope-latin-wght-normal.woff2` и `cormorant-garamond-latin-600-normal.woff2`, `fonts.css`, `site.css`, `<script src="/static/js/site.js" defer>` (файл появится в задаче 8 — до тех пор 404 на скрипт допустим), header, `it.body`, footer.
- `partials/header.eta` — по `home.dc.html:27-71`: логотип (ссылка `it.homeHref`), `nav` (видна от 920 px), переключатель языков `it.langLinks` (активный — светлая «таблетка»), кнопка `it.cta` (от 920 px), бургер (до 920 px, `aria-expanded="false"`, `aria-controls="mobile-nav"`), панель `<div id="mobile-nav" hidden>`: сначала `it.cta` золотом, затем пункты `it.nav`.
- `partials/footer.eta` — по `home.dc.html:243-257`: логотип, ссылка «Меню» (`ui.nav.menu` → `/<lang>/menu`) и `it.nav`, `© <year> Yaqin Gastro Cafe`.
- `error.eta` — тёмно-зелёная секция по центру: код, заголовок, текст, кнопка-«таблетка» `ui.backHome` → `/<lang>`.
- `public/css/site.css`: переменные палитры (раздел 3 спеки) в `:root`, базовые стили из `<style>` макета, шапка (липкая, `height: 72px`, фон `rgba(15,36,26,0.94)` с `backdrop-filter`), футер, страница ошибки. Все отступы и размеры — из inline-стилей макета.

- [ ] **Step 7: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src public test
git commit -m "feat: app bootstrap, seed, site layout, error pages, robots, sitemap"
```

---

### Task 8: Главная страница

**Files:**
- Create: `src/views/public/home.eta`, `public/js/site.js`
- Modify: `src/routes/public.js`, `src/content-schema.js` (`localizeContent` для фото), `public/css/site.css`
- Test: `test/public-home.test.js`

**Interfaces:**
- Consumes: `commonData` (задача 7), `resolveContent`/`localizeContent`/`getStoredContent` (задача 4), `imageSrcset`/`imageUrl` (задача 6).
- Produces:
  - `localizeContent` для поля-фото → `{ id, src, srcset } | null`, где `src = imageUrl(id, <большая ширина>)`.
  - `GET /:lang` — главная; ставит cookie `lang` (`path: '/'`, `maxAge: 31536000`, `sameSite: 'lax'`). Неизвестный язык → `reply.callNotFound()`.
  - `contactLinks(c) → { tel, telegram, instagram, googleMaps, yandexMaps, mapEmbed }` в `src/routes/public-common.js`:
    `tel = 'tel:' + phone без всего, кроме цифр и '+'`, `telegram = 'https://t.me/' + username`, `instagram = 'https://instagram.com/' + username`, `googleMaps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q)`, `yandexMaps = 'https://yandex.uz/maps/?text=' + encodeURIComponent(q)`, `mapEmbed = 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&output=embed'`.

- [ ] **Step 1: Написать падающие тесты**

```js
// test/public-home.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeApp } from './helpers/app.js'
import { saveContent } from '../src/repos/content.js'

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
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL — `/uz` отдаёт 404.

- [ ] **Step 3: Реализовать маршрут `GET /:lang`**

Данные шаблона: `commonData(config, lang, '')` + `c = localizeContent(resolveContent(getStoredContent(db)), lang)` + `links = contactLinks(c)` + `meta.title = 'YAQIN Gastro Cafe — ' + c['hero.tagline']`, `meta.description = c['hero.description']`, `meta.ogImage` = абсолютный URL фото первого экрана шириной 1200 (или `publicUrl + '/static/img/hero-default.webp'`).

- [ ] **Step 4: Реализовать `home.eta` и стили**

Секции и их вёрстка — по макету: первый экран 1a — `home.dc.html:73-98`, «О нас» — `150-170`, «Атмосфера» — `172-189`, «Онлайн-заказ» — `191-203`, «Контакты» — `205-221`, «Как добраться» — `223-241`. Решения сверх макета:
- фон первого экрана — `<img>` с `srcset`, `sizes="100vw"`, `fetchpriority="high"`, `object-fit: cover`; высота секции `min-height: max(620px, calc(100svh - 72px))`;
- все остальные `<img>` — `loading="lazy"` с подходящим `sizes`;
- нет фото → `<div class="ph" aria-hidden="true">YAQIN</div>` (фон `#1E4232`, текст `#C9A96E`, Cormorant Garamond);
- галерея — классы `.gallery__item--1..4` с объединениями ячеек из `home.dc.html:391-393`: до 920 px сетка 2 колонки, строки 170 px; от 920 px — 4 колонки, строки 260 px;
- карточки контактов — телефон (`c['contacts.phone']`, ссылка `links.tel`), Telegram (`@` + имя), Instagram (`@` + имя), часы (`c['info.hoursShort']`, ссылка `#location`), подсказки — `ui.cPhoneHint`… (как в `home.dc.html:395-400`);
- карта — `<iframe title="Map" loading="lazy" src="<%= links.mapEmbed %>">`, ссылки «Google Maps» и `ui.mapYandex` с `target="_blank" rel="noopener"`.

- [ ] **Step 5: Реализовать `public/js/site.js`**

Бургер: по клику переключает `hidden` у `#mobile-nav` и `aria-expanded`; клик по ссылке в панели закрывает её. Без зависимостей, < 1 КБ.

- [ ] **Step 6: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src public test
git commit -m "feat: home page"
```

---

### Task 9: Страница меню и нижняя карточка блюда

**Files:**
- Create: `src/views/public/menu.eta`, `public/js/menu.js`
- Modify: `src/routes/public.js`, `public/css/site.css`
- Test: `test/public-menu.test.js`

**Interfaces:**
- Consumes: `getPublicMenu` (задача 3), `pick`, `formatPrice` (задача 2), `imageSrcset` (задача 6), `commonData` (задача 7).
- Produces:
  - `GET /:lang/menu`; ставит cookie `lang` так же, как главная.
  - Разметка карточки (на неё опирается `menu.js`): `<article class="dish" data-dish-id="<id>">` с `.dish__media` (`<img>` или `.ph`), `h3.dish__name`, `p.dish__desc`, `.dish__amount`, `.dish__price`; секция категории — `<section id="cat-<slug>" class="menu-cat">`; вкладка — `<a class="tab" href="#cat-<slug>" data-tab="<slug>">`; одна `<dialog class="sheet" aria-labelledby="sheet-title">` в конце `<main>`.

- [ ] **Step 1: Написать падающие тесты**

```js
// test/public-menu.test.js
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
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL — `/ru/menu` отдаёт 404.

- [ ] **Step 3: Реализовать маршрут `GET /:lang/menu`**

Данные: `commonData(config, lang, '/menu')`, `c` (как на главной — для `info.hours` и `og:image`), `menu = getPublicMenu(db)` с подготовленными полями: `name = pick(d,'name',lang)`, `desc = pick(d,'desc',lang)`, `amount = d.amount ? d.amount + ' ' + ui.units[d.unit] : ''`, `price = formatPrice(d.price)`, `srcset`. `meta.title = ui.menuTitle + ' — YAQIN Gastro Cafe'`, `meta.description = c['hero.description']`.

- [ ] **Step 4: Реализовать `menu.eta` и стили**

Вёрстка — по `menu.dc.html`: вступление — `72-83`, полоса вкладок — `85-96` (липкая, `top: 72px`, горизонтальная прокрутка без полосы прокрутки), секции и карточки «Photo cards» — `98-123`. Решения сверх макета (раздел 7.4 спеки):
- от 600 px — сетка `repeat(auto-fill, minmax(min(100%, 264px), 1fr))`, карточка как в макете; `sizes="(min-width: 600px) 320px, 50vw"`;
- до 600 px — `grid-template-columns: repeat(2, minmax(0, 1fr))`, `gap: 12px`; в карточке фото 4:3, название (`-webkit-line-clamp: 2`), количество, цена; `.dish__desc` скрыт; карточка — `cursor: pointer`, `role="button"`, `tabindex="0"` (атрибуты ставит `menu.js` только на узком экране);
- `<dialog class="sheet">`: ручка, кнопка ✕ (`aria-label` = `ui.close`), `img.sheet__img` (`sizes="100vw"`), `h3#sheet-title`, описание, количество, цена; прижата к низу, ширина 100 %, `max-height: 90svh`, скругление сверху 24 px; `::backdrop` — `rgba(15,36,26,0.6)`.

- [ ] **Step 5: Реализовать `public/js/menu.js`**

- Вкладки: логика `spy()`, `centerTab()`, `go()` из `menu.dc.html:232-255`; смещение — фактические высоты шапки и полосы вкладок (не константа); клик по вкладке — `preventDefault` и плавная прокрутка; блокировка подсветки на 900 мс после клика.
- Карточка блюда (только при `matchMedia('(max-width: 599px)')`): клик или Enter по `.dish` → заполнить `<dialog>` из разметки карточки, `showModal()`, `history.pushState({ sheet: id }, '', '#dish-' + id)`; `popstate` → закрыть без `history.back()`; ✕, клик по фону (`event.target === dialog`), `Esc` (событие `cancel`) и свайп вниз > 80 px (когда содержимое прокручено к началу) → `history.back()`, который закрывает через `popstate`.
- Проверка бюджета: `wc -c public/js/site.js public/js/menu.js` — сумма ≤ 10240.

- [ ] **Step 6: Запустить — должны пройти**

Run: `npm test && wc -c public/js/site.js public/js/menu.js`
Expected: PASS; итог `wc` ≤ 10240.

- [ ] **Step 7: Commit**

```bash
git add src public test
git commit -m "feat: menu page with sticky tabs and mobile dish sheet"
```

---

### Task 10: Кабинет — вход, каркас, аккаунт

**Files:**
- Create: `src/routes/admin/index.js`, `src/routes/admin/auth.js`, `src/routes/admin/account.js`, `src/views/admin/layout.eta`, `src/views/admin/login.eta`, `src/views/admin/error.eta`, `src/views/admin/account.eta`, `public/css/admin.css`, `public/js/admin.js`, `public/admin.webmanifest`, `scripts/make-icons.js`, `public/img/icon-192.png`, `public/img/icon-512.png`, `test/helpers/admin.js`
- Modify: `src/app.js` (регистрация `routes/admin/index.js` с `prefix: '/admin'`)
- Test: `test/admin-auth.test.js`

**Interfaces:**
- Consumes: `hashPassword`, `verifyPassword`, `SESSION_TTL_MS` (задача 5), репозитории `users`/`sessions`.
- Produces:
  - Плагин `routes/admin/index.js` (`prefix: '/admin'`), внутри:
    - `@fastify/csrf-protection` с `cookieOpts: { signed: true, httpOnly: true, sameSite: 'lax', path: '/admin', secure: config.isProd }`;
    - хук `onRequest`: подписанная cookie `sid` → `findSessionUser` → `request.user`, `request.sessionId`; публичные — только `GET/POST /admin/login`; без сессии: `/admin/api/*` → 401 `{ error: 'Войдите заново' }`, `GET` → 302 `/admin/login?next=<encodeURIComponent(url)>`, иначе → 302 `/admin/login`;
    - хук `preHandler`: для `POST` — `app.csrfProtection`; для `GET` — `request.csrf = reply.generateCsrf()`;
    - `reply.admin(template, data, status = 200)` — декоратор: рендер `admin/<template>` с `{ csrf: request.csrf, user: request.user, saved: request.query.saved === '1', ...data }`;
    - свои `setNotFoundHandler` (страница `error`, 404, «Не найдено») и `setErrorHandler` (ниже).
  - Шаблоны кабинета получают `it.section` (`'menu'|'home'|'account'`), `it.title`, `it.csrf`, `it.saved`.
  - `safeNext(next) → string` (экспорт из `auth.js`): путь, начинающийся с `/admin` и не с `//`, иначе `'/admin'`.
  - `test/helpers/admin.js`: `getCsrf(html) → string` (из `name="_csrf" value="…"`), `form(fields) → { payload: string, headers }`, `loginAs(app, { login = 'admin', password = 'secret-pass-1' } = {}) → Promise<{ cookie: string, csrf: string }>` (GET `/admin/login` → токен и cookie `_csrf`; POST → cookie `sid`; возвращает `'sid=…; _csrf=…'` и токен).

- [ ] **Step 1: Написать хелперы и падающие тесты**

```js
// test/admin-auth.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeApp } from './helpers/app.js'
import { loginAs, form, getCsrf } from './helpers/admin.js'
import { safeNext } from '../src/routes/admin/auth.js'

const app = async t => { const a = await makeApp(); t.after(() => a.close()); return a }
const loginPage = async a => { const r = await a.inject('/admin/login'); return { csrf: getCsrf(r.body), cookie: `_csrf=${r.cookies.find(c => c.name === '_csrf').value}` } }
const tryLogin = async (a, password, next = '') => {
  const p = await loginPage(a)
  return a.inject({ method: 'POST', url: '/admin/login', headers: { cookie: p.cookie, ...form({}).headers }, payload: form({ _csrf: p.csrf, login: 'admin', password, next }).payload })
}

test('admin pages redirect to login without a session', async t => {
  const r = await (await app(t)).inject('/admin/account')
  assert.equal(r.statusCode, 302)
  assert.equal(r.headers.location, '/admin/login?next=%2Fadmin%2Faccount')
})

test('wrong password shows an error', async t => {
  const r = await tryLogin(await app(t), 'nope')
  assert.equal(r.statusCode, 401)
  assert.match(r.body, /Неверный логин или пароль/)
})

test('correct login sets the session cookie and follows next', async t => {
  const r = await tryLogin(await app(t), 'secret-pass-1', '/admin/account')
  assert.equal(r.statusCode, 302)
  assert.equal(r.headers.location, '/admin/account')
  const sid = r.cookies.find(c => c.name === 'sid')
  assert.equal(sid.httpOnly, true)
  assert.equal(sid.sameSite, 'Lax')
  assert.equal(sid.path, '/admin')
})

test('safeNext keeps only paths inside /admin', () => {
  assert.equal(safeNext('/admin/home'), '/admin/home')
  assert.equal(safeNext('https://evil.com'), '/admin')
  assert.equal(safeNext('//evil.com/admin'), '/admin')
  assert.equal(safeNext(undefined), '/admin')
})

test('the sixth login attempt in a minute is rate limited', async t => {
  const a = await app(t)
  for (let i = 0; i < 5; i++) await tryLogin(a, 'nope')
  const r = await tryLogin(a, 'nope')
  assert.equal(r.statusCode, 429)
  assert.match(r.body, /Слишком много попыток/)
})

test('POST without a csrf token is rejected', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  const r = await a.inject({ method: 'POST', url: '/admin/account/password', headers: { cookie, ...form({}).headers }, payload: form({ current: 'secret-pass-1', password: 'new-pass-123', repeat: 'new-pass-123' }).payload })
  assert.equal(r.statusCode, 403)
})

test('logout ends the session', async t => {
  const a = await app(t)
  const { cookie, csrf } = await loginAs(a)
  await a.inject({ method: 'POST', url: '/admin/logout', headers: { cookie, ...form({}).headers }, payload: form({ _csrf: csrf }).payload })
  assert.equal((await a.inject({ url: '/admin/account', headers: { cookie } })).statusCode, 302)
})

test('password change validates input', async t => {
  const a = await app(t)
  const { cookie, csrf } = await loginAs(a)
  const post = fields => a.inject({ method: 'POST', url: '/admin/account/password', headers: { cookie, ...form({}).headers }, payload: form({ _csrf: csrf, ...fields }).payload })
  let r = await post({ current: 'wrong', password: 'new-pass-123', repeat: 'new-pass-123' })
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Неверный текущий пароль/)
  r = await post({ current: 'secret-pass-1', password: 'short', repeat: 'other' })
  assert.match(r.body, /Не короче 8 символов/)
  assert.match(r.body, /Пароли не совпадают/)
})

test('password change keeps this session and ends the others', async t => {
  const a = await app(t)
  const first = await loginAs(a), second = await loginAs(a)
  const r = await a.inject({ method: 'POST', url: '/admin/account/password', headers: { cookie: first.cookie, ...form({}).headers }, payload: form({ _csrf: first.csrf, current: 'secret-pass-1', password: 'new-pass-123', repeat: 'new-pass-123' }).payload })
  assert.equal(r.headers.location, '/admin/account?saved=1')
  assert.equal((await a.inject({ url: '/admin/account', headers: { cookie: first.cookie } })).statusCode, 200)
  assert.equal((await a.inject({ url: '/admin/account', headers: { cookie: second.cookie } })).statusCode, 302)
})

test('unknown admin pages render the admin 404', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  const r = await a.inject({ url: '/admin/nope', headers: { cookie } })
  assert.equal(r.statusCode, 404)
  assert.match(r.body, /Не найдено/)
})
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать плагин, вход и аккаунт**

- `GET /admin/login`: уже вошёл → 302 `/admin`; форма: логин, пароль, скрытые `next`, `_csrf`.
- `POST /admin/login` с `config: { rateLimit: { max: 5, timeWindow: 60000 } }`: успех → `createSession`, cookie `sid` (`signed: true`, параметры из Global Constraints, `maxAge = SESSION_TTL_MS / 1000`), `deleteExpiredSessions`, 302 `safeNext(body.next)`; ошибка → 401 и форма с текстом `Неверный логин или пароль`.
- `POST /admin/logout`: `deleteSession`, `clearCookie('sid', { path: '/admin' })`, 302 `/admin/login`.
- `GET /admin/account`, `POST /admin/account/password`: тексты ошибок — как в тестах; ошибки показываются у полей, статус 400; успех → `setPasswordHash`, `deleteOtherSessions`, 302 `/admin/account?saved=1`. На странице — кнопка «Выйти» (форма POST `/admin/logout`).
- Временный `GET /admin` → 302 `/admin/account` (заменяется в задаче 11).
- `setErrorHandler` кабинета:
  - 429 на `/admin/login` → форма входа со статусом 429 и текстом `Слишком много попыток. Подождите минуту.`;
  - `/admin/api/*` → JSON `{ error }` с кодом ошибки (403 — `Обновите страницу`, 5xx — `Не удалось сохранить`);
  - код `FST_CSRF_*` → страница `error`, 403, `Форма устарела. Обновите страницу и повторите.`;
  - 413 → страница `error`, 413, `Фото больше 15 МБ. Выберите фото поменьше.`;
  - прочие ≥ 500 → лог, страница `error`, 500, `Что-то пошло не так. Попробуйте ещё раз.`

- [ ] **Step 4: Каркас кабинета**

- `layout.eta`: `fonts.css`, `admin.css`, `<link rel="manifest" href="/static/admin.webmanifest">`, `theme-color` `#0F241A`, `apple-touch-icon` `icon-192.png`, `<meta name="csrf-token" content="<%= it.csrf %>">`, шапка «YAQIN · кабинет» и «Открыть сайт ↗» (`/ru`, `target="_blank"`), навигация «Меню» (`/admin`), «Главная» (`/admin/home`), «Аккаунт» (`/admin/account`) с выделением `it.section`, уведомление `<div class="toast" role="status">Сохранено</div>` при `it.saved`, `<script type="module" src="/static/js/admin.js">`.
- `admin.css`: фон `#FBF7F0`, шапка `#0F241A`, акцент `#C9A96E`, колонка до 720 px по центру; до 768 px навигация закреплена внизу (`position: fixed; bottom: 0`, отступ под неё у `body`, учёт `env(safe-area-inset-bottom)`), от 768 px — в шапке; поля и кнопки ≥ 44 px, шрифт полей 16 px (iOS не увеличивает страницу); `.form-actions` прилипает к низу над навигацией.
- `admin.js`: добавляет `js` к `<html>`; прячет `.toast` через 3 с и убирает `saved` из адреса (`history.replaceState`); на `form[data-confirm]` спрашивает `confirm(form.dataset.confirm)` перед отправкой; экспортирует `postJson(url, body) → Promise<object>` (заголовок `x-csrf-token` из `meta[name=csrf-token]`, ошибка → `throw new Error(json.error)`) и `toast(text, isError = false)`.
- `admin.webmanifest`: `name` «Yaqin — кабинет», `short_name` «Yaqin», `start_url` `/admin`, `scope` `/admin`, `display` `standalone`, `theme_color`/`background_color` `#0F241A`, иконки 192 и 512.
- `scripts/make-icons.js` — рисует через `sharp` из SVG (фон `#0F241A`, «YAQIN» цветом `#E2C99A`) `public/img/icon-192.png` и `icon-512.png`; запустить один раз: `node scripts/make-icons.js`.

- [ ] **Step 5: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src public scripts test
git commit -m "feat: admin login, sessions, csrf, layout and account"
```

---

### Task 11: Кабинет — экран «Меню», порядок и видимость

**Files:**
- Create: `src/routes/admin/menu.js`, `src/views/admin/menu.eta`, `public/js/admin-menu.js`, `public/vendor/sortable.min.js`
- Modify: `src/routes/admin/index.js` (убрать временный `GET /admin`), `public/css/admin.css`
- Test: `test/admin-menu.test.js`

**Interfaces:**
- Consumes: `getAdminMenu`, `reorderCategories`, `reorderDishes`, `setCategoryVisible`, `setDishVisible` (задача 3), `imageUrl` (задача 6), `postJson`, `toast` (задача 10).
- Produces:
  - `GET /admin` — экран «Меню».
  - JSON-маршруты (тело и ответы): `POST /admin/api/categories/order` `{ ids: number[] }`; `POST /admin/api/dishes/order` `{ categoryId: number, ids: number[] }`; `POST /admin/api/categories/:id/visibility` и `POST /admin/api/dishes/:id/visibility` `{ visible: boolean }`. Успех — `200 { ok: true }`; неверный набор id — `400 { error: 'Список устарел, обновите страницу' }`; нет строки — `404 { error: 'Не найдено' }`. Тело проверяется JSON-схемой Fastify.
  - Ссылки на экране: правка категории `/admin/categories/<id>/edit`, правка блюда `/admin/dishes/<id>/edit`, «+ Блюдо» `/admin/dishes/new?category=<id>`, «+ Категория» `/admin/categories/new` (страницы — в задаче 12).

- [ ] **Step 1: Написать падающие тесты**

```js
// test/admin-menu.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeApp } from './helpers/app.js'
import { loginAs } from './helpers/admin.js'
import { listCategories } from '../src/repos/categories.js'
import { getDish, listDishes } from '../src/repos/dishes.js'

const setup = async t => { const a = await makeApp(); t.after(() => a.close()); return { a, ...(await loginAs(a)) } }
const api = (a, s, url, body, withCsrf = true) => a.inject({
  method: 'POST', url, payload: body,
  headers: { cookie: s.cookie, 'content-type': 'application/json', ...(withCsrf ? { 'x-csrf-token': s.csrf } : {}) }
})

test('menu screen lists categories, dishes and actions', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin', headers: { cookie: s.cookie } })
  assert.equal(r.statusCode, 200)
  assert.match(r.body, /Завтраки/)
  assert.match(r.body, /href="\/admin\/categories\/1\/edit"/)
  assert.match(r.body, /href="\/admin\/dishes\/1\/edit"/)
  assert.match(r.body, /href="\/admin\/dishes\/new\?category=1"/)
  assert.match(r.body, /href="\/admin\/categories\/new"/)
})

test('category order is saved from the full id list', async t => {
  const s = await setup(t)
  const r = await api(s.a, s, '/admin/api/categories/order', { ids: [5, 4, 3, 2, 1] })
  assert.deepEqual(r.json(), { ok: true })
  assert.deepEqual(listCategories(s.a.db).map(c => c.id), [5, 4, 3, 2, 1])
})

test('a stale id list is rejected and nothing changes', async t => {
  const s = await setup(t)
  const r = await api(s.a, s, '/admin/api/categories/order', { ids: [1, 2] })
  assert.equal(r.statusCode, 400)
  assert.deepEqual(listCategories(s.a.db).map(c => c.id), [1, 2, 3, 4, 5])
})

test('dish order is saved within its category only', async t => {
  const s = await setup(t)
  assert.equal((await api(s.a, s, '/admin/api/dishes/order', { categoryId: 1, ids: [5, 4, 3, 2, 1] })).statusCode, 200)
  assert.deepEqual(listDishes(s.a.db, 1).map(d => d.id), [5, 4, 3, 2, 1])
  assert.equal((await api(s.a, s, '/admin/api/dishes/order', { categoryId: 1, ids: [1, 2, 3, 4, 6] })).statusCode, 400)
})

test('visibility toggles save immediately', async t => {
  const s = await setup(t)
  assert.equal((await api(s.a, s, '/admin/api/dishes/1/visibility', { visible: false })).statusCode, 200)
  assert.equal(getDish(s.a.db, 1).is_visible, false)
  assert.equal((await api(s.a, s, '/admin/api/dishes/999/visibility', { visible: false })).statusCode, 404)
  assert.equal((await api(s.a, s, '/admin/api/categories/1/visibility', { visible: 'no' })).statusCode, 400)
})

test('api needs a session and a csrf token', async t => {
  const s = await setup(t)
  const anon = await s.a.inject({ method: 'POST', url: '/admin/api/categories/order', payload: { ids: [] }, headers: { 'content-type': 'application/json' } })
  assert.equal(anon.statusCode, 401)
  assert.equal((await api(s.a, s, '/admin/api/categories/order', { ids: [1, 2, 3, 4, 5] }, false)).statusCode, 403)
})
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать маршруты**

`src/routes/admin/menu.js` — по Interfaces. Схема тела: `ids` — массив целых, `categoryId` — целое, `visible` — `boolean`; ошибка схемы → 400 с `{ error: 'Неверные данные' }` (через обработчик ошибок кабинета).

- [ ] **Step 4: Реализовать экран и `admin-menu.js`**

- `cp node_modules/sortablejs/Sortable.min.js public/vendor/sortable.min.js` после `npm i --no-save sortablejs@^1.15`; на экране «Меню» — `<script src="/static/vendor/sortable.min.js" defer>`.
- `menu.eta` (раздел 8.3 спеки): категория — `<details class="cat" data-cat-id>` с `<summary>`: ручка `<span class="handle" aria-label="Перетащить">≡</span>`, название RU, число блюд, переключатель `<input type="checkbox" role="switch" data-visibility-url="/admin/api/categories/<id>/visibility">`, ссылка ✎; внутри — `<ul class="dish-list" data-category-id>` со строками `<li data-id>`: ручка, миниатюра 48 px (`imageUrl(id, 400)` или `.ph`), название RU и цена, переключатель видимости; вся строка — ссылка на правку, кроме ручки и переключателя. Скрытые элементы — класс `is-hidden` (приглушены).
- `admin-menu.js`:
  - `Sortable` на списке категорий и на каждом `.dish-list` (`handle: '.handle'`, `animation: 150`); перед перетаскиванием запомнить порядок, после — `postJson`; ошибка → вернуть DOM в прежний порядок и `toast('Не удалось сохранить порядок', true)`;
  - переключатели: `change` → `postJson`; ошибка → вернуть `checked` и `toast('Не удалось сохранить', true)`; успех → переключить `is-hidden`;
  - клик по переключателю и ручке внутри `<summary>` не раскрывает блок (`preventDefault` на `click` у ручки, `stopPropagation` у переключателя);
  - раскрытые категории — массив id в `localStorage['yaqin-admin-open']`, чтение и запись в `try/catch`.
- `admin.js` подключает `admin-menu.js`, если на странице есть `.dish-list`.

- [ ] **Step 5: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src public test
git commit -m "feat: admin menu screen with drag sorting and visibility toggles"
```

---

### Task 12: Кабинет — формы категории и блюда, загрузка фото

**Files:**
- Create: `src/routes/admin/forms.js`, `src/routes/admin/categories.js`, `src/routes/admin/dishes.js`, `src/views/admin/category-form.eta`, `src/views/admin/dish-form.eta`, `src/views/admin/partials/lang-tabs.eta`, `public/js/admin-lang-tabs.js`, `public/js/admin-image-input.js`
- Modify: `src/routes/admin/index.js`, `test/helpers/admin.js` (добавить `multipart`), `public/css/admin.css`
- Test: `test/forms.test.js`, `test/admin-forms.test.js`, `test/client-fit.test.js`

**Interfaces:**
- Consumes: репозитории задачи 3, `slugify`/`uniqueSlug` (задача 2), `app.images`, `ImageError` (задача 6).
- Produces:
  - `parseCategoryForm(body) → { values: { slug: string, name_ru, name_uz, name_en, is_visible }, errors }` — `slug` пустой, если не введён.
  - `parseDishForm(body, categoryIds: number[]) → { values: Omit<DishInput, 'image'>, errors }`.
  - Маршруты — таблица раздела 8.2 спеки (категории и блюда). Успех → 302 `/admin?saved=1`. Поля формы блюда: `category_id`, `name_ru|uz|en`, `desc_ru|uz|en`, `amount`, `unit`, `price`, `is_visible` (`'on'`), `photo` (файл), `remove_photo` (`'on'`), `_csrf`. Форма категории: `name_ru|uz|en`, `slug`, `is_visible`, `_csrf`.
  - `public/js/admin-image-input.js` экспортирует `fitWithin(width, height, max) → { width, height }` (без обращения к DOM при импорте).
  - `test/helpers/admin.js`: `multipart(fields: Record<string, string | { filename: string, content: Buffer, type: string }>) → { payload: Buffer, headers }`.

- [ ] **Step 1: Написать падающие тесты**

```js
// test/forms.test.js
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
})

test('amount is optional and unit is ignored without it', () => {
  let v = parseDishForm(dishBody({ amount: '', unit: 'g' }), [1]).values
  assert.deepEqual([v.amount, v.unit], [null, null])
  v = parseDishForm(dishBody({ amount: '420', unit: 'g' }), [1]).values
  assert.deepEqual([v.amount, v.unit], [420, 'g'])
  assert.equal(parseDishForm(dishBody({ amount: 'abc' }), [1]).errors.amount, 'Количество — целое число')
  assert.equal(parseDishForm(dishBody({ amount: '1', unit: 'kg' }), [1]).errors.amount, 'Выберите единицу')
})

test('dish text fields are required and limited', () => {
  const e = parseDishForm(dishBody({ name_ru: ' ', desc_en: 'x'.repeat(501), category_id: '9' }), [1]).errors
  assert.equal(e.name_ru, 'Введите название на русском')
  assert.equal(e.desc_en, 'Не длиннее 500 символов')
  assert.equal(e.category_id, 'Выберите категорию')
})

test('category slug must be latin with dashes', () => {
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', slug: 'Bad Slug' }).errors.slug, 'Только латиница, цифры и дефис')
  assert.equal(parseCategoryForm({ name_ru: 'x'.repeat(61) }).errors.name_ru, 'Не длиннее 60 символов')
  assert.equal(parseCategoryForm({ name_ru: 'Пицца', is_visible: 'on' }).values.is_visible, true)
})
```

```js
// test/client-fit.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitWithin } from '../public/js/admin-image-input.js'

test('fitWithin scales the long side down to the limit', () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 })
  assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 })
  assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600 })
})
```

```js
// test/admin-forms.test.js
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
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать `src/routes/admin/forms.js`**

Тексты ошибок — точно как в тестах. Все строки `trim()`. Цена и количество — удалить пробелы и ` `, затем `^\d+$`; количество ≤ 100 000. Описание необязательно. `is_visible = body.is_visible === 'on'`. `unit` ∈ `g|ml|pcs`, иначе при заполненном количестве — `Выберите единицу`.

- [ ] **Step 4: Реализовать маршруты категорий и блюд**

- Категория: пустой `slug` → `uniqueSlug(slugify(name_en || name_ru), s => isSlugTaken(db, s, id))`; введённый и занятый → ошибка `slug`: `Такой адрес уже есть`. Удаление: `'not_empty'` → форма правки, 409, текст из теста; `'not_found'` → 404.
- При ошибке форма показывает исходные строки из тела запроса, а не разобранные значения (цена `95 000` остаётся как набрана).
- Блюдо, порядок обработки POST: разобрать форму → ошибки → 400 и форма с введёнными значениями (фото не обрабатывать); фото (`Buffer` длины > 0) → `images.save('dish', buf)`, `ImageError` → 400 и форма с ошибкой у фото; записать в базу (при исключении — `images.remove(newId)` и пробросить); после успеха — `images.remove(oldId)`, если фото заменено или стоит `remove_photo`. Удаление блюда → `deleteDish` → `images.remove(dish.image)`.
- Подсказка у поля фото при ошибке формы: «Выберите фото заново».

- [ ] **Step 5: Шаблоны форм**

- `partials/lang-tabs.eta`: переключатель `RU | UZ | EN` (`<div class="lang-tabs" data-lang-tabs>` с кнопками `data-lang`); переводимые поля обёрнуты в `<div class="field" data-lang="ru|uz|en">`. Подпись поля содержит язык: «Название (RU)».
- `dish-form.eta`: `enctype="multipart/form-data"`; категория — `<select name="category_id">`, выбранный пункт — ровно `<option value="<id>" selected>`; цена и количество — `type="text" inputmode="numeric"`; единица — `<select name="unit">` (г / мл / шт, по умолчанию `g`); фото — текущая миниатюра, `<input type="file" name="photo" accept="image/*" data-image-input>`, `<img class="preview" hidden>`, чекбокс «Удалить фото»; переключатель «Показывать на сайте»; `.form-actions` с «Сохранить»; на форме правки — отдельная `<form method="post" action="…/delete" data-confirm="Удалить блюдо?">` с красной кнопкой «Удалить».
- `category-form.eta`: те же принципы; удаление — `data-confirm="Удалить категорию?"`.
- Ошибка поля — `<p class="field-error">` под полем.

- [ ] **Step 6: Клиентский JS форм**

- `admin-lang-tabs.js`: на `[data-lang-tabs]` показывает только поля выбранного языка (`hidden` у остальных `[data-lang]` в той же форме); стартовая вкладка — первая с `.field-error`, иначе RU; на вкладках с ошибкой — класс `has-error` (красная точка). Пока `<html>` без класса `js`, видны все поля.
- `admin-image-input.js`: `fitWithin` по Interfaces; на `change` у `[data-image-input]`: `createImageBitmap(file, { imageOrientation: 'from-image' })` → canvas `fitWithin(w, h, 2000)` → `canvas.toBlob(cb, 'image/jpeg', 0.85)` → `new DataTransfer()` с `new File([blob], 'photo.jpg', { type: 'image/jpeg' })` → `input.files = dt.files`; предпросмотр — `URL.createObjectURL`; любая ошибка — оставить исходный файл и попробовать показать его предпросмотр.
- `admin.js` подключает оба модуля, если на странице есть `[data-lang-tabs]` / `[data-image-input]`.

- [ ] **Step 7: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src public test
git commit -m "feat: admin category and dish forms with photo upload"
```

---

### Task 13: Кабинет — редактор главной

**Files:**
- Create: `src/routes/admin/home.js`, `src/views/admin/home.eta`
- Modify: `src/routes/admin/index.js`, `public/css/admin.css`
- Test: `test/admin-home.test.js`

**Interfaces:**
- Consumes: `CONTENT_SCHEMA`, `getGroup`, `resolveContent`, `validateGroupInput` (задача 4), `getStoredContent`, `saveContent`, `deleteContent`, `app.images`, `ImageError`, `imageUrl`, lang-tabs и image-input из задачи 12.
- Produces:
  - `GET /admin/home` (`?group=<id>` раскрывает группу), `POST /admin/home/:group` (multipart) → 302 `/admin/home?saved=1&group=<id>`; неизвестная группа → 404.
  - Поля формы группы: `<key>.<lang>` для переводимых, `<key>` для прочих, файл `<key>` и чекбокс `<key>.reset` («Вернуть по умолчанию») для фото.

- [ ] **Step 1: Написать падающие тесты**

```js
// test/admin-home.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { makeApp } from './helpers/app.js'
import { loginAs, multipart } from './helpers/admin.js'
import { jpeg } from './helpers/fixtures.js'
import { CONTENT_SCHEMA, getGroup } from '../src/content-schema.js'
import { getStoredContent } from '../src/repos/content.js'

const setup = async t => { const a = await makeApp(); t.after(() => a.close()); return { a, ...(await loginAs(a)) } }
const groupFields = (id, o = {}) => {
  const f = {}
  for (const x of getGroup(id).fields) {
    if (x.type === 'image') continue
    if (x.translatable) for (const l of ['ru', 'uz', 'en']) f[`${x.key}.${l}`] = x.default[l]
    else f[x.key] = x.default
  }
  return { ...f, ...o }
}
const save = (s, id, fields) => { const m = multipart({ _csrf: s.csrf, ...fields }); return s.a.inject({ method: 'POST', url: `/admin/home/${id}`, headers: { cookie: s.cookie, ...m.headers }, payload: m.payload }) }
const uploads = s => fs.readdirSync(s.a.config.uploadsDir)

test('editor shows every group of the schema', async t => {
  const s = await setup(t)
  const r = await s.a.inject({ url: '/admin/home', headers: { cookie: s.cookie } })
  for (const g of CONTENT_SCHEMA) assert.match(r.body, new RegExp(g.title))
})

test('saving a group updates the site', async t => {
  const s = await setup(t)
  const r = await save(s, 'hero', groupFields('hero', { 'hero.tagline.ru': 'Новый слоган' }))
  assert.equal(r.headers.location, '/admin/home?saved=1&group=hero')
  assert.match((await s.a.inject('/ru')).body, /Новый слоган/)
})

test('missing Russian text keeps the typed values', async t => {
  const s = await setup(t)
  const r = await save(s, 'about', groupFields('about', { 'about.title.ru': '', 'about.p1.ru': 'Мой абзац' }))
  assert.equal(r.statusCode, 400)
  assert.match(r.body, /Заполните текст на русском/)
  assert.match(r.body, /Мой абзац/)
})

test('an invalid group with a photo saves nothing', async t => {
  const s = await setup(t)
  const r = await save(s, 'hero', groupFields('hero', { 'hero.tagline.ru': '', 'hero.image': { filename: 'h.jpg', type: 'image/jpeg', content: await jpeg() } }))
  assert.equal(r.statusCode, 400)
  assert.deepEqual(uploads(s), [])
  assert.deepEqual(getStoredContent(s.a.db), {})
})

test('telegram given as a link is stored as a username', async t => {
  const s = await setup(t)
  await save(s, 'contacts', groupFields('contacts', { 'contacts.telegram': 'https://t.me/yaqin_new' }))
  assert.match((await s.a.inject('/ru')).body, /href="https:\/\/t\.me\/yaqin_new"/)
})

test('replacing a photo removes the old one and reset restores the default', async t => {
  const s = await setup(t)
  await save(s, 'hero', groupFields('hero', { 'hero.image': { filename: 'a.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const first = getStoredContent(s.a.db)['hero.image'].image
  await save(s, 'hero', groupFields('hero', { 'hero.image': { filename: 'b.jpg', type: 'image/jpeg', content: await jpeg() } }))
  const second = getStoredContent(s.a.db)['hero.image'].image
  assert.ok(uploads(s).every(f => f.startsWith(second)))
  assert.notEqual(first, second)
  await save(s, 'hero', groupFields('hero', { 'hero.image.reset': 'on' }))
  assert.deepEqual(uploads(s), [])
  assert.match((await s.a.inject('/ru')).body, /hero-default\.webp/)
})

test('unknown group is 404', async t => {
  const s = await setup(t)
  assert.equal((await save(s, 'nope', {})).statusCode, 404)
})
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать `src/routes/admin/home.js`**

Порядок POST: `getGroup` (нет → 404) → `validateGroupInput` → ошибки → 400, страница с раскрытой группой, введёнными значениями и ошибками (фото не обрабатывать) → для каждого поля-фото: `reset` → ключ в список на удаление; файл длины > 0 → `images.save(field.imageKind, buf)` (при `ImageError` — удалить уже сохранённые в этом запросе фото и вернуть 400 с ошибкой у поля) → одна транзакция: `saveContent(values + { [key]: { image: id } })` и `deleteContent(resetKeys)` → удалить старые файлы заменённых и сброшенных фото → 302.

- [ ] **Step 4: Реализовать `home.eta`**

Группы — `<details>` в порядке схемы, раскрыта группа из `?group=` или с ошибками; в каждой — своя форма `multipart` с `_csrf`, переключателем языков (если есть переводимые поля), полями (`textarea` для `textarea`, `type="tel"` для `phone`), у фото — текущая картинка (`imageUrl(id, <меньшая ширина>)`; без фото — `/static/img/hero-default.webp` для `hero.image`, иначе `.ph`), `<input type="file" name="<key>" accept="image/*" data-image-input>`, чекбокс «Вернуть по умолчанию»; `.form-actions` с «Сохранить».

- [ ] **Step 5: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src public test
git commit -m "feat: admin home content editor"
```

---

### Task 14: Docker, бэкап, сброс пароля, README

**Files:**
- Create: `scripts/backup.js`, `scripts/set-password.js`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.example`, `Caddyfile.example`, `README.md`
- Test: `test/scripts.test.js`

**Interfaces:**
- Consumes: `loadConfig`, `openDb`, `migrate`, `hashPassword`, `findUserByLogin`, `setPasswordHash`, `deleteAllSessions`.
- Produces:
  - `backupDatabase(dbFile, backupsDir, now = new Date()) → Promise<string>` — путь `backupsDir/yaqin-YYYY-MM-DD-HHmm.db` через `db.backup(dest)` (better-sqlite3).
  - `setPassword(db, login, newPassword) → Promise<'ok'|'not_found'|'too_short'>` — меняет хэш и удаляет все сессии пользователя.
  - Оба файла — модули с экспортом и CLI-запуском при `import.meta.main`-эквиваленте (`process.argv[1] === fileURLToPath(import.meta.url)`). `set-password`: логин — `argv[2]`, пароль — из `NEW_PASSWORD` или запрос через `readline`.

- [ ] **Step 1: Написать падающие тесты**

```js
// test/scripts.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { openDb, migrate } from '../src/db/index.js'
import { seedMenu } from '../src/db/seed.js'
import { createUser } from '../src/repos/users.js'
import { createSession, findSessionUser } from '../src/repos/sessions.js'
import { hashPassword, verifyPassword } from '../src/services/auth.js'
import { backupDatabase } from '../scripts/backup.js'
import { setPassword } from '../scripts/set-password.js'

test('backupDatabase writes a readable copy', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-bk-'))
  const file = path.join(dir, 'yaqin.db')
  const db = openDb(file); migrate(db); seedMenu(db); db.close()
  const out = await backupDatabase(file, path.join(dir, 'backups'), new Date('2026-10-14T09:05:00'))
  assert.equal(path.basename(out), 'yaqin-2026-10-14-0905.db')
  assert.equal(new Database(out, { readonly: true }).prepare('select count(*) n from dishes').get().n, 24)
})

test('setPassword changes the hash and ends sessions', async () => {
  const db = openDb(':memory:'); migrate(db)
  const u = createUser(db, 'admin', await hashPassword('old-pass-123'))
  const s = createSession(db, u.id)
  assert.equal(await setPassword(db, 'admin', 'short'), 'too_short')
  assert.equal(await setPassword(db, 'ghost', 'new-pass-123'), 'not_found')
  assert.equal(await setPassword(db, 'admin', 'new-pass-123'), 'ok')
  assert.equal(findSessionUser(db, s.id), undefined)
  const row = db.prepare('select password_hash from users where id = ?').get(u.id)
  assert.equal(await verifyPassword('new-pass-123', row.password_hash), true)
})
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать скрипты**

Время в имени бэкапа — локальное время процесса (`getFullYear`, `getMonth` …), папка создаётся при необходимости. Сообщения CLI — на русском: «Бэкап сохранён: <путь>», «Пароль изменён, все сессии завершены», «Пользователь не найден», «Пароль не короче 8 символов». Ненулевой код выхода при ошибке.

- [ ] **Step 4: Запустить — должны пройти**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Docker и документация**

- `Dockerfile`: `FROM node:22-slim`, `WORKDIR /app`, `ENV NODE_ENV=production DATA_DIR=/app/data`, `COPY package*.json ./`, `RUN npm ci --omit=dev`, `COPY src ./src`, `COPY public ./public`, `COPY scripts ./scripts`, `RUN mkdir -p /app/data && chown node:node /app/data`, `USER node`, `EXPOSE 3000`, `CMD ["node", "src/server.js"]`. Если `npm ci` не находит готовую сборку `better-sqlite3`, добавить перед ним `apt-get install -y python3 make g++` в отдельной стадии сборки.
- `.dockerignore`: `node_modules`, `data`, `.env`, `.git`, `docs`, `test`.
- `docker-compose.yml`: сервис `app`, `build: .`, `env_file: .env`, `ports: ["127.0.0.1:3000:3000"]`, `volumes: ["./data:/app/data"]`, `restart: unless-stopped`.
- `.env.example`: все переменные раздела 13 спеки с примерами (`NODE_ENV=production`, `PUBLIC_URL=https://yaqin.uz`, `SESSION_SECRET=` с подсказкой `openssl rand -hex 32`, `TRUST_PROXY=true`).
- `Caddyfile.example`: `yaqin.uz { encode zstd gzip; reverse_proxy localhost:3000 }`.
- `README.md` (на русском): локальный запуск (`cp .env.example .env`, `npm i`, `npm run dev`), запуск на VPS (`docker compose up -d --build`), Caddy, где лежат данные, `docker compose exec app npm run backup`, `docker compose exec app npm run set-password -- admin`, как добавить кабинет на экран «Домой».

- [ ] **Step 6: Проверить образ**

Run:
```bash
cp .env.example .env && sed -i 's/^SESSION_SECRET=.*/SESSION_SECRET=local-check-0123456789abcdef0123456789/; s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=check-pass-123/' .env
docker compose up -d --build && sleep 3
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/ru
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/admin/login
docker compose exec app npm run backup
docker compose down && rm .env
```
Expected: `200`, `200`, строка «Бэкап сохранён: /app/data/backups/yaqin-…db». Если Docker недоступен — так и записать в отчёте задачи.

- [ ] **Step 7: Commit**

```bash
git add scripts Dockerfile .dockerignore docker-compose.yml .env.example Caddyfile.example README.md test
git commit -m "feat: docker deployment, backup and password reset scripts, README"
```

---

### Task 15: Финальная проверка в браузере

**Files:** —, только исправления найденных проблем (каждое — отдельным коммитом с тестом, если поведение проверяемо через `inject`).

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: PASS, 0 падений.

- [ ] **Step 2: Запустить сайт и макеты**

```bash
cp .env.example .env   # NODE_ENV=development, ADMIN_LOGIN=admin, ADMIN_PASSWORD=<пароль>, PUBLIC_URL=http://localhost:3000
npm run dev
python3 -m http.server 8090 -d docs/design   # макеты: http://localhost:8090/home.dc.html, /menu.dc.html
```

- [ ] **Step 3: Проверить на ширине 375 × 812 и 1280 × 800**

Сайт — сравнить с макетами:
- главная: первый экран не прыгает при прокрутке на телефоне, бургер открывает и закрывает меню, переключатель языков ведёт на ту же страницу, карта грузится;
- меню: вкладки прилипают под шапкой, нажатие прокручивает к категории, подсветка следует за прокруткой и центрирует вкладку;
- на 375 px — сетка в 2 колонки, нажатие открывает нижнюю карточку; закрывается ✕, тапом по фону, свайпом вниз и кнопкой «Назад» браузера (страница при этом не уходит);
- на 1280 px — карточки с описанием, нажатие ничего не открывает;
- в консоли браузера нет ошибок CSP.

Кабинет на 375 px:
- вход; нижняя навигация не перекрывает кнопку «Сохранить»;
- перетаскивание категорий и блюд за ручку, прокрутка пальцем по строкам не перетаскивает;
- переключатель видимости сохраняется без перезагрузки и сразу виден на сайте;
- новое блюдо с фото: предпросмотр появляется, на сайте фото есть; вкладки RU | UZ | EN, точка на вкладке с ошибкой;
- главная: правка слогана и замена фото первого экрана видны на сайте;
- смена пароля, выход.

- [ ] **Step 4: Записать результат**

Список проверенного и найденного — в отчёт по задаче; исправления — коммитами `fix: …`.
