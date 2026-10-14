import { randomBytes } from 'node:crypto'
import { SESSION_TTL_MS, hashPassword, verifyPassword } from '../../services/auth.js'
import { findUserByLogin } from '../../repos/users.js'
import { createSession, deleteExpiredSessions, deleteSession } from '../../repos/sessions.js'

const BAD_CREDENTIALS = 'Неверный логин или пароль'

// Хэш случайной строки: для неизвестного логина пароль всё равно проверяется, чтобы ответ шёл столько же,
// сколько для известного, и по времени нельзя было угадать, есть ли такой логин.
const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'))

// Только путь внутри кабинета: /admin, /admin/..., /admin?...; без пробелов, управляющих и не-ASCII символов.
const ADMIN_PATH = /^\/admin(?:[/?][\x21-\x7e]{0,2000})?$/

export function safeNext(next) {
  return typeof next === 'string' && ADMIN_PATH.test(next) ? next : '/admin'
}

export function renderLogin(reply, { error = '', login = '', next = '' } = {}, status = 200) {
  return reply.admin('login', { title: 'Вход', error, login, next: safeNext(next) }, status)
}

export default async function authRoutes(app) {
  app.get('/login', { config: { public: true } }, async (request, reply) => {
    if (request.user) return reply.redirect('/admin')
    return renderLogin(reply, { next: request.query.next })
  })

  app.post('/login', {
    config: { public: true, rateLimit: { max: 5, timeWindow: 60000 } }
  }, async (request, reply) => {
    const body = request.body ?? {}
    const login = typeof body.login === 'string' ? body.login.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const user = findUserByLogin(app.db, login)
    const passwordOk = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH)
    if (!user || !passwordOk) return renderLogin(reply, { error: BAD_CREDENTIALS, login, next: body.next }, 401)

    // Новая сессия при каждом входе; прежняя сессия этого браузера (если была) больше не нужна.
    if (request.sessionId) deleteSession(app.db, request.sessionId)
    const session = createSession(app.db, user.id)
    deleteExpiredSessions(app.db)
    reply.setCookie('sid', session.id, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      path: '/admin',
      secure: app.config.isProd,
      maxAge: SESSION_TTL_MS / 1000
    })
    return reply.redirect(safeNext(body.next))
  })

  app.post('/logout', async (request, reply) => {
    deleteSession(app.db, request.sessionId)
    reply.clearCookie('sid', { path: '/admin' })
    return reply.redirect('/admin/login')
  })
}
