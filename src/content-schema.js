import { LANGS, tr } from './services/i18n.js'
import { IMAGE_WIDTHS, imageKind, imageSrcset, imageUrl } from './services/images.js'

const text = (key, label, def) => ({ key, type: 'text', translatable: true, label, default: def })
const textarea = (key, label, def) => ({ key, type: 'textarea', translatable: true, label, default: def })
const plain = (key, label, def) => ({ key, type: 'plain', translatable: false, label, default: def })
const phone = (key, label, def) => ({ key, type: 'phone', translatable: false, label, default: def })
const username = (key, label, def) => ({ key, type: 'username', translatable: false, label, default: def })
const image = (key, label, imageKind) => ({ key, type: 'image', translatable: false, label, imageKind })

export const CONTENT_SCHEMA = [
  {
    id: 'hero',
    title: 'Первый экран',
    fields: [
      text('hero.floor', 'Строка над названием', {
        ru: 'NRG U-Tower  |  1 этаж',
        uz: 'NRG U-Tower  |  1-qavat',
        en: 'NRG U-Tower  |  1st floor'
      }),
      text('hero.tagline', 'Слоган', {
        ru: 'Больше, чем просто кафе',
        uz: 'Shunchaki kafedan ko’proq',
        en: 'More than just a cafe'
      }),
      textarea('hero.description', 'Описание', {
        ru: 'Сытные завтраки, ароматный кофе, свежая выпечка и горячие блюда — каждый день на первом этаже NRG U-Tower.',
        uz: 'To’yimli nonushtalar, xushbo’y qahva, yangi pishiriqlar va issiq taomlar — har kuni NRG U-Tower’ning birinchi qavatida.',
        en: 'Hearty breakfasts, fragrant coffee, fresh pastries and hot dishes — every day on the first floor of NRG U-Tower.'
      }),
      image('hero.image', 'Фото', 'hero')
    ]
  },
  {
    id: 'info',
    title: 'Часы и адрес',
    fields: [
      text('info.hours', 'Часы работы', {
        ru: 'Ежедневно 08:00 – 23:00',
        uz: 'Har kuni 08:00 – 23:00',
        en: 'Daily 08:00 – 23:00'
      }),
      plain('info.hoursShort', 'Часы работы (кратко)', '08:00 – 23:00'),
      text('info.addressShort', 'Адрес (кратко)', {
        ru: 'NRG U-Tower, 1 этаж',
        uz: 'NRG U-Tower, 1-qavat',
        en: 'NRG U-Tower, 1st floor'
      }),
      text('info.addressFull', 'Адрес (полностью)', {
        ru: 'NRG U-Tower, 1 этаж, Ташкент',
        uz: 'NRG U-Tower, 1-qavat, Toshkent',
        en: 'NRG U-Tower, 1st floor, Tashkent'
      })
    ]
  },
  {
    id: 'about',
    title: 'О нас',
    fields: [
      text('about.title', 'Заголовок', {
        ru: 'Место, куда хочется возвращаться',
        uz: 'Yana qaytgingiz keladigan joy',
        en: 'A place you’ll want to come back to'
      }),
      textarea('about.p1', 'Абзац 1', {
        ru: '«Yaqin» по-узбекски значит «близкий» — именно так мы хотим, чтобы вы здесь себя чувствовали. Утренний кофе перед работой, неспешный обед с коллегами или ужин с семьёй.',
        uz: '«Yaqin» — bu sizga yaqin joy. Bu yerda o’zingizni uydagidek his qilishingizni istaymiz: ish oldidan ertalabki qahva, hamkasblar bilan shoshilmasdan tushlik yoki oila bilan kechki ovqat.',
        en: '“Yaqin” means “close” in Uzbek — and that’s exactly how we want you to feel here. A morning coffee before work, an unhurried lunch with colleagues or dinner with family.'
      }),
      textarea('about.p2', 'Абзац 2', {
        ru: 'Мы готовим из свежих продуктов, печём каждое утро и подаём блюда так, как хотели бы, чтобы подавали нам.',
        uz: 'Biz yangi mahsulotlardan tayyorlaymiz, har tong pishiriq yopamiz va taomlarni o’zimizga qanday tortilishini istasak, shunday tortamiz.',
        en: 'We cook from fresh produce, bake every morning and serve each dish the way we’d like it served to us.'
      }),
      image('about.image', 'Фото', 'about'),
      text('about.f1.title', 'Преимущество 1: заголовок', {
        ru: 'Вкусные блюда',
        uz: 'Mazali taomlar',
        en: 'Great food'
      }),
      text('about.f1.text', 'Преимущество 1: текст', {
        ru: 'Европейская и узбекская кухня',
        uz: 'Yevropa va o’zbek oshxonasi',
        en: 'European and Uzbek cuisine'
      }),
      text('about.f2.title', 'Преимущество 2: заголовок', {
        ru: 'Кофе и десерты',
        uz: 'Qahva va desertlar',
        en: 'Coffee & desserts'
      }),
      text('about.f2.text', 'Преимущество 2: текст', {
        ru: 'Авторский кофе и выпечка',
        uz: 'Mualliflik qahvasi va pishiriqlar',
        en: 'Specialty coffee and pastries'
      }),
      text('about.f3.title', 'Преимущество 3: заголовок', {
        ru: 'Онлайн-заказ',
        uz: 'Onlayn buyurtma',
        en: 'Order online'
      }),
      text('about.f3.text', 'Преимущество 3: текст', {
        ru: 'Закажите заранее — заберёте без ожидания',
        uz: 'Oldindan buyurtma bering — kutmasdan oling',
        en: 'Order ahead and skip the wait'
      })
    ]
  },
  {
    id: 'gallery',
    title: 'Атмосфера',
    fields: [
      text('gallery.title', 'Заголовок', {
        ru: 'Наш интерьер',
        uz: 'Bizning interyer',
        en: 'Our interior'
      }),
      textarea('gallery.description', 'Описание', {
        ru: 'Уютный зал с живой зеленью, мягким светом и тёплым деревом — для встреч, работы и отдыха.',
        uz: 'Jonli o’simliklar, yumshoq yorug’lik va iliq yog’och — uchrashuvlar, ish va dam olish uchun qulay zal.',
        en: 'A cozy hall with living greenery, soft light and warm wood — for meetings, work and rest.'
      }),
      image('gallery.image1', 'Фото 1', 'gallery'),
      image('gallery.image2', 'Фото 2', 'gallery'),
      image('gallery.image3', 'Фото 3', 'gallery'),
      image('gallery.image4', 'Фото 4', 'gallery')
    ]
  },
  {
    id: 'order',
    title: 'Онлайн-заказ',
    fields: [
      text('order.title', 'Заголовок', {
        ru: 'Закажите заранее — мы всё приготовим',
        uz: 'Oldindan buyurtma bering — biz tayyorlab qo’yamiz',
        en: 'Order ahead — we’ll have it ready'
      }),
      textarea('order.description', 'Описание', {
        ru: 'Оставьте заказ в Telegram или позвоните нам — он будет готов к вашему приходу.',
        uz: 'Telegram orqali buyurtma qoldiring yoki qo’ng’iroq qiling — kelishingizga tayyor bo’ladi.',
        en: 'Send your order via Telegram or give us a call, and it’ll be ready when you arrive.'
      })
    ]
  },
  {
    id: 'contacts',
    title: 'Контакты',
    fields: [
      phone('contacts.phone', 'Телефон', '+998 90 000 00 00'),
      username('contacts.telegram', 'Telegram', 'yaqin_gastro'),
      username('contacts.instagram', 'Instagram', 'yaqin.gastro')
    ]
  },
  {
    id: 'location',
    title: 'Как добраться',
    fields: [
      text('location.title', 'Заголовок', {
        ru: 'Ждём вас в NRG U-Tower',
        uz: 'Sizni NRG U-Tower’da kutamiz',
        en: 'Find us at NRG U-Tower'
      }),
      plain('location.mapQuery', 'Запрос для карты', 'NRG U-Tower, Tashkent')
    ]
  }
]

const FIELDS = CONTENT_SCHEMA.flatMap(group => group.fields)

const MAX_LENGTH = { text: 200, plain: 200, phone: 200, username: 200, textarea: 1000 }
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/
const USERNAME_RE = /^[A-Za-z0-9._]{1,32}$/

export function getGroup(id) {
  return CONTENT_SCHEMA.find(group => group.id === id)
}

export function resolveContent(stored) {
  const resolved = {}
  for (const field of FIELDS) {
    const value = stored[field.key]
    if (field.type === 'image') {
      resolved[field.key] = typeof value?.image === 'string' ? value.image : null
    } else if (field.translatable) {
      const own = value !== null && typeof value === 'object' ? value : field.default
      resolved[field.key] = { ...own }
    } else {
      resolved[field.key] = typeof value === 'string' ? value : field.default
    }
  }
  return resolved
}

const asText = value => (typeof value === 'string' ? value : '').trim()

const tooLong = (value, type) => value.length > MAX_LENGTH[type]
const tooLongError = type => `Не длиннее ${MAX_LENGTH[type]} символов`

function validateTranslatable(field, body) {
  const value = {}
  for (const lang of LANGS) value[lang] = asText(body[`${field.key}.${lang}`])

  if (value.ru === '') return { value, error: 'Заполните текст на русском' }
  if (LANGS.some(lang => tooLong(value[lang], field.type))) return { value, error: tooLongError(field.type) }
  return { value }
}

const SCHEME_RE = /^https?:\/\//i
// Ссылка — это адрес со схемой или «домен/имя…»; одиночный слэш в конце («@name/») ссылкой не считается.
const LINK_RE = /^[^/]+\/+[^/?#]/

// Имя из ссылки на профиль или из «@name»: «https://www.instagram.com/name?igsh=…», «t.me/name/», «@name» → «name».
function usernameOf(value) {
  const bare = value.replace(/^@/, '')
  if (!SCHEME_RE.test(bare) && !LINK_RE.test(bare)) return bare.replace(/\/+$/, '')
  try {
    const url = new URL(SCHEME_RE.test(bare) ? bare : `https://${bare}`)
    return url.pathname.split('/').find(Boolean) ?? ''
  } catch {
    return value
  }
}

function validateSingle(field, body) {
  let value = asText(body[field.key])

  if (field.type === 'username') value = usernameOf(value)

  if (tooLong(value, field.type)) return { value, error: tooLongError(field.type) }
  if (field.type === 'plain' && value === '') return { value, error: 'Заполните поле' }
  if (field.type === 'phone' && !PHONE_RE.test(value)) return { value, error: 'Телефон в формате +998 90 000 00 00' }
  if (field.type === 'username' && !USERNAME_RE.test(value)) return { value, error: 'Только латиница, цифры, точка и _' }
  return { value }
}

export function validateGroupInput(group, body) {
  const values = {}
  const errors = {}
  for (const field of group.fields) {
    if (field.type === 'image') continue
    const { value, error } = field.translatable ? validateTranslatable(field, body) : validateSingle(field, body)
    values[field.key] = value
    if (error) errors[field.key] = error
  }
  return { values, errors }
}

// src — запасной адрес для браузеров без srcset: самый крупный вариант фото.
function localizeImage(id) {
  const widths = IMAGE_WIDTHS[imageKind(id)]
  return { id, src: imageUrl(id, widths.at(-1)), srcset: imageSrcset(id) }
}

export function localizeContent(resolved, lang) {
  const localized = {}
  for (const field of FIELDS) {
    const value = resolved[field.key]
    if (field.type === 'image') localized[field.key] = value ? localizeImage(value) : null
    else if (field.translatable) localized[field.key] = tr(value, lang)
    else localized[field.key] = value
  }
  return localized
}
