export const LANGS = ['ru', 'uz', 'en']
export const SWITCHER_ORDER = ['uz', 'ru', 'en']
export const DEFAULT_LANG = 'ru'

export function isLang(value) {
  return LANGS.includes(value)
}

const filled = s => typeof s === 'string' && s.trim() !== ''

export function tr(value, lang) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    if (filled(value[lang])) return value[lang]
    if (filled(value[DEFAULT_LANG])) return value[DEFAULT_LANG]
  }
  return ''
}

export function pick(row, field, lang) {
  const own = row[`${field}_${lang}`]
  if (filled(own)) return own
  const fallback = row[`${field}_${DEFAULT_LANG}`]
  return filled(fallback) ? fallback : ''
}

export function formatPrice(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
