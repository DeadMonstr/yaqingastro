import { CONTENT_SCHEMA, getGroup, resolveContent, validateGroupInput } from '../../content-schema.js'
import { deleteContent, getStoredContent, saveContent } from '../../repos/content.js'
import { IMAGE_WIDTHS, ImageError, imageUrl } from '../../services/images.js'
import { LANGS } from '../../services/i18n.js'

const PAGE = { section: 'home', title: 'Главная' }
const DEFAULT_HERO = { key: 'hero.image', src: '/static/img/hero-default.webp' }
const savedUrl = group => `/admin/home?saved=1&group=${group.id}`

const asString = value => (typeof value === 'string' ? value : '')
const hasFile = value => Buffer.isBuffer(value) && value.length > 0

// Язык, в котором ошибка переводимого поля: там показывается текст ошибки и горит точка на вкладке.
// Проверяем правилами самой схемы: русский вариант берём как есть, другой язык — при заведомо заполненном русском.
function errorLang(field, body) {
  const text = lang => body[`${field.key}.${lang}`]
  const invalid = lang => {
    const probe = { [`${field.key}.ru`]: lang === 'ru' ? text('ru') : 'x', [`${field.key}.${lang}`]: text(lang) }
    return validateGroupInput({ fields: [field] }, probe).errors[field.key]
  }
  return LANGS.find(invalid) ?? 'ru'
}

// Фото в форме: сохранённое, фото по умолчанию (только у первого экрана) или пустое место.
function photoOf(field, id) {
  if (id) return { src: imageUrl(id, IMAGE_WIDTHS[field.imageKind][0]), custom: true }
  return { src: field.key === DEFAULT_HERO.key ? DEFAULT_HERO.src : null, custom: false }
}

// Поле для шаблона. form — введённое в группе, которая не сохранилась (иначе значения берутся из сохранённого).
function viewField(field, resolved, form) {
  const view = { key: field.key, type: field.type, label: field.label, translatable: field.translatable, error: form?.errors[field.key] ?? null }

  if (field.type === 'image') {
    return {
      ...view,
      image: photoOf(field, resolved[field.key]),
      reset: form?.body[`${field.key}.reset`] === 'on',
      retry: form ? hasFile(form.body[field.key]) : false
    }
  }
  if (field.translatable) {
    const values = Object.fromEntries(LANGS.map(lang => [
      lang,
      form ? asString(form.body[`${field.key}.${lang}`]) : (resolved[field.key][lang] ?? '')
    ]))
    return { ...view, values, errorLang: view.error ? errorLang(field, form.body) : null }
  }
  return { ...view, value: form ? asString(form.body[field.key]) : resolved[field.key] }
}

export default async function homeRoutes(app) {
  const { db, images } = app

  // open — id группы из адреса; failed — { group, body, errors } после неудачного сохранения.
  function render(reply, { open = null, failed = null, status = 200 } = {}) {
    const resolved = resolveContent(getStoredContent(db))
    const groups = CONTENT_SCHEMA.map(group => {
      const form = failed?.group === group ? failed : null
      return {
        id: group.id,
        title: group.title,
        open: form !== null || group.id === open,
        invalid: form !== null,
        hasTabs: group.fields.some(field => field.translatable),
        fields: group.fields.map(field => viewField(field, resolved, form))
      }
    })
    return reply.admin('home', { ...PAGE, groups }, status)
  }

  const discard = ids => Promise.all(ids.map(id => images.remove(id)))

  // Порядок: проверка текстов → файлы фото → одна запись в базу → удаление старых фото. Каждый шаг отменяет предыдущие при сбое.
  app.post('/home/:group', async (request, reply) => {
    const group = getGroup(request.params.group)
    if (!group) return reply.callNotFound()

    const body = request.body ?? {}
    const fail = errors => render(reply, { failed: { group, body, errors }, status: 400 })

    const { values, errors } = validateGroupInput(group, body)
    if (Object.keys(errors).length) return fail(errors)

    // Новое фото важнее «Вернуть по умолчанию»: как и в форме блюда, выбранный файл заменяет всё.
    const uploaded = {}
    const resets = []
    for (const field of group.fields.filter(item => item.type === 'image')) {
      if (!hasFile(body[field.key])) {
        if (body[`${field.key}.reset`] === 'on') resets.push(field.key)
        continue
      }
      try {
        uploaded[field.key] = await images.save(field.imageKind, body[field.key])
      } catch (err) {
        await discard(Object.values(uploaded))
        if (err instanceof ImageError) return fail({ [field.key]: err.message })
        throw err
      }
    }

    // Старые фото берём из базы внутри транзакции: пока сохранялись файлы, группу мог изменить другой запрос.
    let replaced
    try {
      db.transaction(() => {
        const stored = getStoredContent(db)
        replaced = [...Object.keys(uploaded), ...resets].map(key => stored[key]?.image).filter(id => typeof id === 'string')
        saveContent(db, {
          ...values,
          ...Object.fromEntries(Object.entries(uploaded).map(([key, id]) => [key, { image: id }]))
        })
        deleteContent(db, resets)
      })()
    } catch (err) {
      await discard(Object.values(uploaded))
      throw err
    }

    await discard(replaced)
    return reply.redirect(savedUrl(group))
  })

  app.get('/home', async (request, reply) => render(reply, { open: request.query.group }))
}
