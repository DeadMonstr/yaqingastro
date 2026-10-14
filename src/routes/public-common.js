import { DEFAULT_LANG, LANGS, SWITCHER_ORDER } from '../services/i18n.js'
import { UI } from '../i18n/ui.js'

// Данные, общие для всех страниц сайта: шапка, подвал, языки и мета-ссылки.
// path: '' — главная, '/menu' — меню, null — страница без пары в других языках (404/500).
export function commonData(config, lang, path) {
  const ui = UI[lang]
  const base = `/${lang}`
  const suffix = path ?? ''

  const langLinks = SWITCHER_ORDER.map(code => ({
    code,
    label: code.toUpperCase(),
    href: `/${code}${suffix}`,
    active: code === lang
  }))

  const isHome = path === ''
  const nav = isHome
    ? [
        { label: ui.nav.about, href: '#about' },
        { label: ui.nav.gallery, href: '#gallery' },
        { label: ui.nav.contact, href: '#contact' },
        { label: ui.nav.location, href: '#location' }
      ]
    : [
        { label: ui.nav.home, href: base },
        { label: ui.nav.about, href: `${base}#about` },
        { label: ui.nav.contact, href: `${base}#contact` },
        { label: ui.nav.location, href: `${base}#location` }
      ]
  const cta = isHome
    ? { label: ui.nav.menu, href: `${base}/menu` }
    : { label: ui.ctaOrder, href: `${base}#order` }

  const absolute = code => `${config.publicUrl}/${code}${suffix}`
  const alternates = [
    ...LANGS.map(code => ({ hreflang: code, href: absolute(code) })),
    { hreflang: 'x-default', href: absolute(DEFAULT_LANG) }
  ]

  return {
    lang,
    ui,
    langLinks,
    nav,
    cta,
    homeHref: base,
    year: new Date().getFullYear(),
    meta: { canonical: absolute(lang), alternates }
  }
}
