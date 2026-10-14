import { listCategories } from '../../repos/categories.js'
import { createDish, deleteDish, getDish, updateDish } from '../../repos/dishes.js'
import { ImageError, imageUrl } from '../../services/images.js'
import { LANGS } from '../../services/i18n.js'
import { parseDishForm, parseId, rawValues } from './forms.js'

const PAGE = { section: 'menu' }
const SAVED = '/admin?saved=1'
const THUMB_WIDTH = 400
const TEXT_FIELDS = ['category_id', 'amount', 'unit', 'price', ...LANGS.flatMap(lang => [`name_${lang}`, `desc_${lang}`])]

const BLANK = {
  category_id: '', amount: '', unit: 'g', price: '', is_visible: true,
  ...Object.fromEntries(LANGS.flatMap(lang => [[`name_${lang}`, ''], [`desc_${lang}`, '']]))
}

// Значения для полей формы: цена — просто цифры, как её правят, а не с пробелами разрядов.
const fromRow = dish => ({
  ...Object.fromEntries(TEXT_FIELDS.map(name => [name, dish[name] ?? ''])),
  category_id: String(dish.category_id),
  unit: dish.unit ?? 'g',
  price: String(dish.price),
  is_visible: dish.is_visible
})

const fromBody = body => ({ ...rawValues(body, TEXT_FIELDS), is_visible: body?.is_visible === 'on' })
const hasFile = value => Buffer.isBuffer(value) && value.length > 0

export default async function dishRoutes(app) {
  const { db, images } = app

  // dish — правимое блюдо или null для нового; values — строки, как их показывает форма.
  // retryPhoto — файл был выбран, но не сохранился: браузер не покажет его в форме снова.
  function renderForm(reply, dish, values, { errors = {}, removePhoto = false, retryPhoto = false, status = 200 } = {}) {
    return reply.admin('dish-form', {
      ...PAGE,
      title: dish ? 'Правка блюда' : 'Новое блюдо',
      dish: dish && { id: dish.id, name: dish.name_ru, photo: dish.image ? imageUrl(dish.image, THUMB_WIDTH) : null },
      categories: listCategories(db).map(category => ({ id: category.id, name: category.name_ru })),
      values,
      errors,
      removePhoto,
      retryPhoto
    }, status)
  }

  // Порядок: форма → файлы фото → запись в базу → удаление старого фото. Каждый шаг отменяет предыдущие при сбое.
  async function save(request, reply, dish) {
    const body = request.body ?? {}
    const removePhoto = body.remove_photo === 'on'
    const fail = errors => renderForm(reply, dish, fromBody(body), { errors, removePhoto, retryPhoto: hasFile(body.photo), status: 400 })

    const { values, errors } = parseDishForm(body, listCategories(db).map(category => category.id))
    if (Object.keys(errors).length) return fail(errors)

    let newImage = null
    if (hasFile(body.photo)) {
      try {
        newImage = await images.save('dish', body.photo)
      } catch (err) {
        if (err instanceof ImageError) return fail({ photo: err.message })
        throw err
      }
    }

    let saved, previousImage = null
    try {
      if (dish) {
        // Пока сохранялось фото, блюдо могли изменить или удалить: старое фото берём из базы сейчас.
        const current = getDish(db, dish.id)
        if (current) {
          previousImage = current.image
          saved = updateDish(db, dish.id, { ...values, image: newImage ?? (removePhoto ? null : current.image) })
        }
      } else {
        saved = createDish(db, { ...values, image: newImage })
      }
    } catch (err) {
      await images.remove(newImage)
      throw err
    }

    if (!saved) {
      await images.remove(newImage)
      return reply.callNotFound()
    }
    if (previousImage && previousImage !== saved.image) await images.remove(previousImage)
    return reply.redirect(SAVED)
  }

  app.get('/dishes/new', async (request, reply) => {
    const wanted = parseId(request.query.category)
    const categories = listCategories(db)
    const selected = categories.find(category => category.id === wanted) ?? categories[0]
    return renderForm(reply, null, { ...BLANK, category_id: String(selected?.id ?? '') })
  })

  app.post('/dishes', async (request, reply) => save(request, reply, null))

  app.get('/dishes/:id/edit', async (request, reply) => {
    const dish = getDish(db, parseId(request.params.id))
    if (!dish) return reply.callNotFound()
    return renderForm(reply, dish, fromRow(dish))
  })

  app.post('/dishes/:id', async (request, reply) => {
    const dish = getDish(db, parseId(request.params.id))
    if (!dish) return reply.callNotFound()
    return save(request, reply, dish)
  })

  app.post('/dishes/:id/delete', async (request, reply) => {
    const deleted = deleteDish(db, parseId(request.params.id))
    if (!deleted) return reply.callNotFound()
    await images.remove(deleted.image)
    return reply.redirect(SAVED)
  })
}
