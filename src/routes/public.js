import { DEFAULT_LANG, LANGS, formatPrice, isLang, pick } from '../services/i18n.js'
import { imageSrcset, imageUrl } from '../services/images.js'
import { localizeContent, resolveContent } from '../content-schema.js'
import { getStoredContent } from '../repos/content.js'
import { getPublicMenu } from '../repos/menu.js'
import { commonData, contactLinks } from './public-common.js'

const LANG_COOKIE_MAX_AGE = 365 * 24 * 60 * 60
const OG_IMAGE_WIDTH = 1200
const DEFAULT_HERO = '/static/img/hero-default.webp'
const DISH_THUMB_WIDTH = 400

// Редактируемые тексты сайта на языке страницы.
const siteContent = (app, lang) => localizeContent(resolveContent(getStoredContent(app.db)), lang)

// Мета-данные страницы: описание и картинка для соцсетей берутся с первого экрана главной.
function pageMeta(app, common, c, title) {
  const hero = c['hero.image']
  return {
    ...common.meta,
    title,
    description: c['hero.description'],
    ogImage: app.config.publicUrl + (hero ? imageUrl(hero.id, OG_IMAGE_WIDTH) : DEFAULT_HERO)
  }
}

const rememberLang = (reply, lang) =>
  reply.setCookie('lang', lang, { path: '/', maxAge: LANG_COOKIE_MAX_AGE, sameSite: 'lax' })

// Меню в виде, готовом для шаблона: тексты на языке страницы, цена и количество строками.
function localizeMenu(menu, lang, ui) {
  return menu.map(category => ({
    slug: category.slug,
    name: pick(category, 'name', lang),
    dishes: category.dishes.map(dish => ({
      id: dish.id,
      name: pick(dish, 'name', lang),
      desc: pick(dish, 'desc', lang),
      amount: dish.amount ? `${dish.amount} ${ui.units[dish.unit] ?? ''}`.trim() : '',
      price: formatPrice(dish.price),
      image: dish.image ? { src: imageUrl(dish.image, DISH_THUMB_WIDTH), srcset: imageSrcset(dish.image) } : null
    }))
  }))
}

// Язык из cookie, если он известен, иначе русский.
const savedLang = request => (isLang(request.cookies.lang) ? request.cookies.lang : DEFAULT_LANG)

export default async function publicRoutes(app) {
  const { publicUrl } = app.config

  app.get('/', async (request, reply) => reply.redirect(`/${savedLang(request)}`, 302))

  // Адрес без языка для QR-кода на столах.
  app.get('/menu', async (request, reply) => reply.redirect(`/${savedLang(request)}/menu`, 302))

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

    const c = siteContent(app, lang)
    const common = commonData(app.config, lang, '')
    const meta = pageMeta(app, common, c, `YAQIN Gastro Cafe — ${c['hero.tagline']}`)

    rememberLang(reply, lang)
    return reply.view('public/home', { ...common, meta, c, links: contactLinks(c), defaultHero: DEFAULT_HERO })
  })

  app.get('/:lang/menu', async (request, reply) => {
    const { lang } = request.params
    if (!isLang(lang)) return reply.callNotFound()

    const c = siteContent(app, lang)
    const common = commonData(app.config, lang, '/menu')
    const meta = pageMeta(app, common, c, `${common.ui.menuTitle} — YAQIN Gastro Cafe`)
    const menu = localizeMenu(getPublicMenu(app.db), lang, common.ui)

    rememberLang(reply, lang)
    return reply.view('public/menu', { ...common, meta, c, menu, mainClass: 'menu-page' })
  })
}
