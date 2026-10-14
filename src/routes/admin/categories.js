import { createCategory, deleteCategory, getCategory, isSlugTaken, updateCategory } from '../../repos/categories.js'
import { slugify, uniqueSlug } from '../../services/slug.js'
import { parseCategoryForm, parseId, rawValues } from './forms.js'

const PAGE = { section: 'menu' }
const SAVED = '/admin?saved=1'
const SLUG_TAKEN = 'Такой адрес уже есть'
const NOT_EMPTY = 'Сначала перенесите или удалите блюда этой категории'
const TEXT_FIELDS = ['name_ru', 'name_uz', 'name_en', 'slug']

const fromRow = category => ({
  name_ru: category.name_ru,
  name_uz: category.name_uz,
  name_en: category.name_en,
  slug: category.slug,
  is_visible: category.is_visible
})

const fromBody = body => ({ ...rawValues(body, TEXT_FIELDS), is_visible: body?.is_visible === 'on' })

export default async function categoryRoutes(app) {
  const { db } = app

  // category — правимая категория или null для новой; values — строки, как их показывает форма.
  const renderForm = (reply, category, values, { errors = {}, formError = null, status = 200 } = {}) =>
    reply.admin('category-form', {
      ...PAGE,
      title: category ? 'Правка категории' : 'Новая категория',
      category: category && { id: category.id },
      values,
      errors,
      formError
    }, status)

  function save(request, reply, category) {
    const id = category?.id ?? null
    const { values, errors } = parseCategoryForm(request.body)
    if (values.slug && !errors.slug && isSlugTaken(db, values.slug, id)) errors.slug = SLUG_TAKEN
    if (Object.keys(errors).length) return renderForm(reply, category, fromBody(request.body), { errors, status: 400 })

    const slug = values.slug || uniqueSlug(slugify(values.name_en || values.name_ru), taken => isSlugTaken(db, taken, id))
    const input = { ...values, slug }
    if (category) updateCategory(db, id, input)
    else createCategory(db, input)
    return reply.redirect(SAVED)
  }

  app.get('/categories/new', async (request, reply) =>
    renderForm(reply, null, { name_ru: '', name_uz: '', name_en: '', slug: '', is_visible: true }))

  app.post('/categories', async (request, reply) => save(request, reply, null))

  app.get('/categories/:id/edit', async (request, reply) => {
    const category = getCategory(db, parseId(request.params.id))
    if (!category) return reply.callNotFound()
    return renderForm(reply, category, fromRow(category))
  })

  app.post('/categories/:id', async (request, reply) => {
    const category = getCategory(db, parseId(request.params.id))
    if (!category) return reply.callNotFound()
    return save(request, reply, category)
  })

  app.post('/categories/:id/delete', async (request, reply) => {
    const id = parseId(request.params.id)
    const result = deleteCategory(db, id)
    if (result === 'not_found') return reply.callNotFound()
    if (result === 'not_empty') {
      const category = getCategory(db, id)
      return renderForm(reply, category, fromRow(category), { formError: NOT_EMPTY, status: 409 })
    }
    return reply.redirect(SAVED)
  })
}
