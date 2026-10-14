import csrfProtection from '@fastify/csrf-protection'
import { findSessionUser } from '../../repos/sessions.js'
import authRoutes, { renderLogin } from './auth.js'
import accountRoutes from './account.js'

const TOO_MANY_ATTEMPTS = 'Слишком много попыток. Подождите минуту.'

const pathOf = url => url.split('?')[0]
const isApi = request => pathOf(request.url).startsWith('/admin/api/')

// Сообщение для JSON-маршрутов по коду ответа.
function apiMessage(status) {
  if (status === 403) return 'Обновите страницу'
  if (status === 404) return 'Не найдено'
  if (status === 413) return 'Файл слишком большой'
  if (status === 429) return 'Слишком много запросов'
  return status >= 500 ? 'Не удалось сохранить' : 'Некорректный запрос'
}

// Текст на странице ошибки.
function pageMessage(err, status) {
  if (err.code?.startsWith('FST_CSRF_')) return 'Форма устарела. Обновите страницу и повторите.'
  if (status === 413) return 'Фото больше 15 МБ. Выберите фото поменьше.'
  if (status >= 500) return 'Что-то пошло не так. Попробуйте ещё раз.'
  return 'Не удалось обработать запрос. Обновите страницу и повторите.'
}

export default async function adminRoutes(app) {
  const { config } = app

  app.decorateRequest('user', null)
  app.decorateRequest('sessionId', null)
  app.decorateRequest('csrf', null)

  await app.register(csrfProtection, {
    cookieOpts: { signed: true, httpOnly: true, sameSite: 'lax', path: '/admin', secure: config.isProd }
  })

  // Страницы кабинета содержат токены и личные данные: браузер и прокси их не сохраняют.
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store')

    const signed = request.cookies.sid
    const sid = typeof signed === 'string' ? request.unsignCookie(signed) : null
    const user = sid?.valid ? findSessionUser(app.db, sid.value) : undefined
    if (user) {
      // В запрос попадают только id и логин: хэш пароля шаблонам не нужен.
      request.user = { id: user.id, login: user.login }
      request.sessionId = sid.value
    }

    if (user || request.routeOptions.config?.public) return
    if (isApi(request)) return reply.code(401).send({ error: 'Войдите заново' })
    return reply.redirect(request.method === 'GET' ? `/admin/login?next=${encodeURIComponent(request.url)}` : '/admin/login')
  })

  app.addHook('preHandler', (request, reply, done) => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      request.csrf = reply.generateCsrf()
      return done()
    }
    return app.csrfProtection(request, reply, done)
  })

  // Формы, которые показываются заново после ошибки (в том числе ответ 429), берут токен здесь.
  app.decorateReply('admin', function admin(template, data, status = 200) {
    const { request } = this
    if (!request.csrf) request.csrf = this.generateCsrf()
    return this.code(status).view(`admin/${template}`, {
      csrf: request.csrf,
      user: request.user,
      saved: request.query.saved === '1',
      ...data
    })
  })

  app.setNotFoundHandler((request, reply) => {
    if (isApi(request)) return reply.code(404).send({ error: apiMessage(404) })
    return reply.admin('error', { title: 'Не найдено', code: 404, text: 'Такой страницы в кабинете нет.' }, 404)
  })

  app.setErrorHandler((err, request, reply) => {
    const status = err.statusCode >= 400 && err.statusCode <= 599 ? err.statusCode : 500
    if (status >= 500) request.log.error(err)

    if (status === 429 && request.method === 'POST' && pathOf(request.url) === '/admin/login') {
      return renderLogin(reply, { error: TOO_MANY_ATTEMPTS, next: request.query.next }, 429)
    }
    if (isApi(request)) return reply.code(status).send({ error: apiMessage(status) })

    return reply.admin('error', { title: 'Ошибка', code: status, text: pageMessage(err, status) }, status)
  })

  app.get('/', async (request, reply) => reply.redirect('/admin/account')) // временно, до экрана «Меню»

  await app.register(authRoutes)
  await app.register(accountRoutes)
}
