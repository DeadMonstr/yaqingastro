import path from 'node:path'
import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import formbody from '@fastify/formbody'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import view from '@fastify/view'
import fastifyStatic from '@fastify/static'
import { Eta } from 'eta'
import { openDb, migrate } from './db/index.js'
import { seedMenu } from './db/seed.js'
import { deleteExpiredSessions } from './repos/sessions.js'
import { ensureAdmin } from './services/auth.js'
import { createImageStore } from './services/images.js'
import { DEFAULT_LANG, isLang } from './services/i18n.js'
import { commonData } from './routes/public-common.js'
import publicRoutes from './routes/public.js'

const ROOT = path.join(import.meta.dirname, '..')
const VIEWS_DIR = path.join(import.meta.dirname, 'views')
const PUBLIC_DIR = path.join(ROOT, 'public')

const MB = 1024 * 1024

const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'frame-src': ['https://www.google.com', 'https://maps.google.com'],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'font-src': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"]
}

// Язык страницы ошибки — первый сегмент адреса, если это язык, иначе русский.
function langOfUrl(url) {
  const first = url.split(/[/?#]/)[1]
  return isLang(first) ? first : DEFAULT_LANG
}

function renderError(app, request, reply, code, titleKey, textKey) {
  const common = commonData(app.config, langOfUrl(request.url), null)
  const heading = common.ui[titleKey]
  const text = common.ui[textKey]
  const meta = {
    ...common.meta,
    canonical: null,
    alternates: [],
    title: `${heading} — YAQIN Gastro Cafe`,
    description: text,
    ogImage: null
  }
  return reply.code(code).view('public/error', { ...common, meta, code, heading, text })
}

export async function buildApp(config) {
  const app = Fastify({ logger: config.logger, trustProxy: config.trustProxy })

  const db = openDb(config.dbFile)
  app.addHook('onClose', async () => { db.close() })
  const { from } = migrate(db)
  if (from === 0) seedMenu(db)
  await ensureAdmin(db, config, app.log)
  deleteExpiredSessions(db)

  app.decorate('db', db)
  app.decorate('config', config)
  app.decorate('images', createImageStore({ dir: config.uploadsDir, log: app.log }))

  await app.register(helmet, { contentSecurityPolicy: { useDefaults: false, directives: CSP_DIRECTIVES } })
  await app.register(cookie, { secret: config.sessionSecret })
  await app.register(formbody)
  await app.register(multipart, {
    attachFieldsToBody: 'keyValues',
    limits: { fileSize: 15 * MB, files: 4 }
  })
  await app.register(rateLimit, { global: false })
  await app.register(view, {
    engine: { eta: new Eta({ views: VIEWS_DIR, autoEscape: true, cache: config.isProd }) },
    root: VIEWS_DIR,
    viewExt: 'eta'
  })
  await app.register(fastifyStatic, { root: PUBLIC_DIR, prefix: '/static/', maxAge: '7d' })
  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
    maxAge: '365d',
    immutable: true
  })

  await app.register(publicRoutes)

  app.setNotFoundHandler((request, reply) =>
    renderError(app, request, reply, 404, 'notFoundTitle', 'notFoundText'))

  app.setErrorHandler((err, request, reply) => {
    const clientError = err.statusCode >= 400 && err.statusCode <= 499
    if (!clientError) request.log.error(err)
    return renderError(app, request, reply, clientError ? err.statusCode : 500, 'errorTitle', 'errorText')
  })

  return app
}
