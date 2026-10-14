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

// ---- Дополнительные проверки каркаса ----

const postForm = (a, url, { cookie, csrf }, fields = {}) =>
  a.inject({ method: 'POST', url, headers: { cookie, ...form({}).headers }, payload: form({ _csrf: csrf, ...fields }).payload })
const pageText = body => body.match(/error-block__text">([^<]*)/)?.[1]

test('a logged-in visitor is sent from the login page to the admin', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  const r = await a.inject({ url: '/admin/login', headers: { cookie } })
  assert.equal(r.statusCode, 302)
  assert.equal(r.headers.location, '/admin')
  assert.equal((await a.inject({ url: '/admin', headers: { cookie } })).statusCode, 200)
})

test('the login form keeps a safe next and drops a foreign one', async t => {
  const a = await app(t)
  assert.match((await a.inject('/admin/login?next=%2Fadmin%2Faccount')).body, /name="next" value="\/admin\/account"/)
  assert.match((await a.inject('/admin/login?next=https%3A%2F%2Fevil.com')).body, /name="next" value="\/admin"/)
})

test('an unknown login gets the same answer as a wrong password', async t => {
  const a = await app(t)
  const p = await loginPage(a)
  const r = await a.inject({ method: 'POST', url: '/admin/login', headers: { cookie: p.cookie, ...form({}).headers }, payload: form({ _csrf: p.csrf, login: 'nobody', password: 'secret-pass-1' }).payload })
  assert.equal(r.statusCode, 401)
  assert.match(r.body, /Неверный логин или пароль/)
  assert.equal(r.cookies.find(c => c.name === 'sid'), undefined)
})

test('login ignores fields that are not strings', async t => {
  const a = await app(t)
  const p = await loginPage(a)
  const r = await a.inject({ method: 'POST', url: '/admin/login', headers: { cookie: p.cookie, 'content-type': 'application/json' }, payload: JSON.stringify({ _csrf: p.csrf, login: { a: 1 }, password: ['x'], next: 5 }) })
  assert.equal(r.statusCode, 401)
})

test('a tampered session cookie is not accepted', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  const forged = cookie.replace(/(sid=[0-9a-f]{64})\.[^;]+/, '$1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
  assert.notEqual(forged, cookie)
  assert.equal((await a.inject({ url: '/admin/account', headers: { cookie: forged } })).statusCode, 302)
  const unsigned = cookie.replace(/(sid=[0-9a-f]{64})\.[^;]+/, '$1')
  assert.equal((await a.inject({ url: '/admin/account', headers: { cookie: unsigned } })).statusCode, 302)
})

test('the rate limit page carries a token that is ready for the next attempt', async t => {
  const a = await app(t)
  for (let i = 0; i < 5; i++) await tryLogin(a, 'nope')
  const r = await tryLogin(a, 'nope')
  assert.equal(r.statusCode, 429)
  assert.ok(getCsrf(r.body))
})

test('cookies are Secure in production', async t => {
  const a = await makeApp({ isProd: true })
  t.after(() => a.close())
  const csrfCookie = (await a.inject('/admin/login')).cookies.find(c => c.name === '_csrf')
  assert.deepEqual([csrfCookie.secure, csrfCookie.httpOnly, csrfCookie.sameSite, csrfCookie.path], [true, true, 'Lax', '/admin'])
  const sid = (await tryLogin(a, 'secret-pass-1')).cookies.find(c => c.name === 'sid')
  assert.deepEqual([sid.secure, sid.httpOnly, sid.sameSite, sid.path], [true, true, 'Lax', '/admin'])
})

test('logout clears the session cookie and is protected by csrf', async t => {
  const a = await app(t)
  const session = await loginAs(a)
  assert.equal((await postForm(a, '/admin/logout', { cookie: session.cookie, csrf: 'bad' })).statusCode, 403)
  assert.equal((await a.inject({ url: '/admin/account', headers: { cookie: session.cookie } })).statusCode, 200)
  const r = await postForm(a, '/admin/logout', session)
  assert.equal(r.headers.location, '/admin/login')
  assert.equal(r.cookies.find(c => c.name === 'sid').value, '')
})

test('a new password works for login and the old one does not', async t => {
  const a = await app(t)
  const session = await loginAs(a)
  await postForm(a, '/admin/account/password', session, { current: 'secret-pass-1', password: 'new-pass-123', repeat: 'new-pass-123' })
  await assert.rejects(loginAs(a, { password: 'secret-pass-1' }))
  await loginAs(a, { password: 'new-pass-123' })
})

test('the account page never shows the password hash', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  assert.doesNotMatch((await a.inject({ url: '/admin/account', headers: { cookie } })).body, /scrypt/)
})

test('a stale csrf token shows the form-expired page', async t => {
  const a = await app(t)
  const session = await loginAs(a)
  const r = await postForm(a, '/admin/account/password', { ...session, csrf: 'stale' }, { current: 'x', password: 'y', repeat: 'y' })
  assert.equal(r.statusCode, 403)
  assert.equal(pageText(r.body), 'Форма устарела. Обновите страницу и повторите.')
})

test('admin JSON routes answer with JSON errors', async t => {
  const a = await app(t)
  const anon = await a.inject('/admin/api/categories/order')
  assert.equal(anon.statusCode, 401)
  assert.deepEqual(anon.json(), { error: 'Войдите заново' })

  const session = await loginAs(a)
  const json = headers => ({ method: 'POST', url: '/admin/api/nope', payload: '{}', headers: { cookie: session.cookie, 'content-type': 'application/json', ...headers } })
  const noToken = await a.inject(json({}))
  assert.equal(noToken.statusCode, 403)
  assert.deepEqual(noToken.json(), { error: 'Обновите страницу' })
  const missing = await a.inject(json({ 'x-csrf-token': session.csrf }))
  assert.equal(missing.statusCode, 404)
  assert.deepEqual(missing.json(), { error: 'Не найдено' })
})

test('an oversized upload gets the photo-size message', async t => {
  const a = await app(t)
  const session = await loginAs(a)
  const boundary = '----yaqin'
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="_csrf"\r\n\r\n${session.csrf}\r\n--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="a.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  const payload = Buffer.concat([Buffer.from(head), Buffer.alloc(16 * 1024 * 1024, 65), Buffer.from(`\r\n--${boundary}--\r\n`)])
  const r = await a.inject({ method: 'POST', url: '/admin/account/password', headers: { cookie: session.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload })
  assert.equal(r.statusCode, 413)
  assert.equal(pageText(r.body), 'Фото больше 15 МБ. Выберите фото поменьше.')
})

test('a server failure shows a generic message and no details', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  a.db.close()
  const page = await a.inject({ url: '/admin/account', headers: { cookie } })
  assert.equal(page.statusCode, 500)
  assert.equal(pageText(page.body), 'Что-то пошло не так. Попробуйте ещё раз.')
  const api = await a.inject({ url: '/admin/api/anything', headers: { cookie } })
  assert.equal(api.statusCode, 500)
  assert.deepEqual(api.json(), { error: 'Не удалось сохранить' })
})

test('admin pages are not cached and need no inline scripts or styles', async t => {
  const a = await app(t)
  const { cookie } = await loginAs(a)
  for (const [url, headers] of [['/admin/login', {}], ['/admin/account', { cookie }], ['/admin/nope', { cookie }]]) {
    const r = await a.inject({ url, headers })
    assert.equal(r.headers['cache-control'], 'no-store', url)
    assert.doesNotMatch(r.body, /\sstyle=|\son[a-z]+=|<script(?![^>]*\ssrc=)/i, url)
  }
})

test('the manifest and its icons are served', async t => {
  const a = await app(t)
  const res = await a.inject('/static/admin.webmanifest')
  assert.equal(res.statusCode, 200)
  const manifest = res.json()
  assert.deepEqual([manifest.start_url, manifest.scope, manifest.display, manifest.theme_color], ['/admin', '/admin', 'standalone', '#0F241A'])
  for (const icon of manifest.icons) {
    const r = await a.inject(icon.src)
    assert.equal(r.statusCode, 200)
    assert.equal(r.headers['content-type'], 'image/png')
  }
})
