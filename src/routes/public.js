import { DEFAULT_LANG, LANGS, isLang } from '../services/i18n.js'

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
}
