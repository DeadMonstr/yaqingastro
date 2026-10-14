// Разбор и проверка форм категории и блюда. Функции чистые: тело запроса на входе, значения и ошибки на выходе.

import { LANGS } from '../../services/i18n.js'

const UNITS = ['g', 'ml', 'pcs']

const LIMITS = { categoryName: 60, categorySlug: 60, dishName: 120, desc: 500, amount: 100_000, price: 100_000_000 }
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

const MESSAGES = {
  nameRequired: 'Введите название на русском',
  tooLong: n => `Не длиннее ${n} символов`,
  slug: 'Только латиница, цифры и дефис',
  category: 'Выберите категорию',
  amount: 'Количество — целое число',
  unit: 'Выберите единицу',
  price: 'Цена — целое число от 0 до 100 000 000'
}

// Отсутствующее или не строковое поле считается пустым.
const raw = value => (typeof value === 'string' ? value : '')
const text = value => raw(value).trim()
const length = value => [...value].length

// С телефона цену набирают с пробелами и неразрывными пробелами: «95 000».
const digits = value => raw(value).replace(/\s+/g, '')

// Целое число от 0 до max или null.
function toInteger(value, max) {
  const s = digits(value)
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return n <= max ? n : null
}

function checkLength(errors, field, value, max) {
  if (length(value) > max) errors[field] = MESSAGES.tooLong(max)
}

export function parseCategoryForm(body) {
  const src = body ?? {}
  const values = {
    slug: text(src.slug),
    name_ru: text(src.name_ru),
    name_uz: text(src.name_uz),
    name_en: text(src.name_en),
    is_visible: src.is_visible === 'on'
  }

  const errors = {}
  if (!values.name_ru) errors.name_ru = MESSAGES.nameRequired
  for (const lang of LANGS) {
    const field = `name_${lang}`
    if (!errors[field]) checkLength(errors, field, values[field], LIMITS.categoryName)
  }
  if (values.slug && !SLUG.test(values.slug)) errors.slug = MESSAGES.slug
  else checkLength(errors, 'slug', values.slug, LIMITS.categorySlug)

  return { values, errors }
}

export function parseDishForm(body, categoryIds) {
  const src = body ?? {}
  const errors = {}

  const categoryId = toInteger(src.category_id, Number.MAX_SAFE_INTEGER)
  if (categoryId === null || !categoryIds.includes(categoryId)) errors.category_id = MESSAGES.category

  const values = { category_id: errors.category_id ? null : categoryId }
  for (const lang of LANGS) {
    values[`name_${lang}`] = text(src[`name_${lang}`])
    if (lang === 'ru' && !values.name_ru) errors.name_ru = MESSAGES.nameRequired
    else checkLength(errors, `name_${lang}`, values[`name_${lang}`], LIMITS.dishName)
  }
  for (const lang of LANGS) {
    values[`desc_${lang}`] = text(src[`desc_${lang}`])
    checkLength(errors, `desc_${lang}`, values[`desc_${lang}`], LIMITS.desc)
  }

  // Без количества единица не нужна и не сохраняется.
  const unit = text(src.unit)
  let amount = null
  if (digits(src.amount) !== '') {
    amount = toInteger(src.amount, LIMITS.amount)
    if (amount === null) errors.amount = MESSAGES.amount
    else if (!UNITS.includes(unit)) errors.amount = MESSAGES.unit
  }
  values.amount = errors.amount ? null : amount
  values.unit = values.amount === null ? null : unit

  const price = toInteger(src.price, LIMITS.price)
  if (price === null) errors.price = MESSAGES.price
  values.price = price

  values.is_visible = src.is_visible === 'on'
  return { values, errors }
}

// Номер из адреса: целое от 1, всё остальное — «такого нет».
export function parseId(value) {
  return typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value) ? Number(value) : null
}

// Введённые строки как есть: после ошибки форма показывает их, а не разобранные значения («95 000» остаётся как набрано).
export function rawValues(body, names) {
  return Object.fromEntries(names.map(name => [name, raw(body?.[name])]))
}
