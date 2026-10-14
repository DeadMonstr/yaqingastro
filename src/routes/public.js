import { DEFAULT_LANG, LANGS, isLang } from '../services/i18n.js'
import { imageUrl } from '../services/images.js'
import { localizeContent, resolveContent } from '../content-schema.js'
import { getStoredContent } from '../repos/content.js'
import { commonData, contactLinks } from './public-common.js'

const LANG_COOKIE_MAX_AGE = 365 * 24 * 60 * 60
const OG_IMAGE_WIDTH = 1200
const DEFAULT_HERO = '/static/img/hero-default.webp'

export default async function publicRoutes(app) {
  const { publicUrl } = app.config

  app.get('/', async (request, reply) => {
    const saved = request.cookies.lang
    return reply.redirect(`/${isLang(saved) ? saved : DEFAULT_LANG}`, 302)
  })

  app.get('/robots.txt', async (request, reply) => {
    reply.type('text/plain; charset=utf-8')
    return `User-agent: *\nDisallow: /admin\nSitemap: ${publicUrl}/sitemap.xml\n`
  })

  app.get('/sitemap.xml', async (request, reply) => {
    const urls = LANGS.flatMap(lang => [`${publicUrl}/${lang}`, `${publicUrl}/${lang}/menu`])
    reply.type('application/xml; charset=utf-8')
    return `<?xml version="1.0" encoding="UTF-8"?>\n`
      + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
      + urls.map(url => `  <url><loc>${url}</loc></url>\n`).join('')
      + `</urlset>\n`
  })

  app.get('/:lang', async (request, reply) => {
    const { lang } = request.params
    if (!isLang(lang)) return reply.callNotFound()

    const c = localizeContent(resolveContent(getStoredContent(app.db)), lang)
    const common = commonData(app.config, lang, '')
    const hero = c['hero.image']
    const meta = {
      ...common.meta,
      title: `YAQIN Gastro Cafe — ${c['hero.tagline']}`,
      description: c['hero.description'],
      ogImage: publicUrl + (hero ? imageUrl(hero.id, OG_IMAGE_WIDTH) : DEFAULT_HERO)
    }

    reply.setCookie('lang', lang, { path: '/', maxAge: LANG_COOKIE_MAX_AGE, sameSite: 'lax' })
    return reply.view('public/home', { ...common, meta, c, links: contactLinks(c), defaultHero: DEFAULT_HERO })
  })
}
