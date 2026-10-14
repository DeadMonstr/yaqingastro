import { getAdminMenu } from '../../repos/menu.js'
import { getCategory, reorderCategories, setCategoryVisible } from '../../repos/categories.js'
import { reorderDishes, setDishVisible } from '../../repos/dishes.js'
import { formatPrice } from '../../services/i18n.js'
import { imageUrl } from '../../services/images.js'

const PAGE = { section: 'menu', title: 'Меню' }
const THUMB_WIDTH = 400

const OK = { ok: true }
const STALE = { error: 'Список устарел, обновите страницу' }
const NOT_FOUND = { error: 'Не найдено' }

// Тела проверяются строго: Ajv у Fastify приводит типы (1 → true, "5" → 5), а здесь нужен ровно тот тип, что описан.
const id = { type: 'integer', minimum: 1 }
const params = { type: 'object', required: ['id'], properties: { id } }
const body = properties => ({ type: 'object', required: Object.keys(properties), additionalProperties: false, properties })
const ids = { type: 'array', items: id }
const visible = { enum: [true, false] }

const schema = {
  categoryOrder: { body: body({ ids }) },
  dishOrder: { body: body({ categoryId: id, ids }) },
  visibility: { params, body: body({ visible }) }
}

// «1 блюдо», «2 блюда», «5 блюд», «11 блюд».
function dishCount(n) {
  const last = n % 10, tens = n % 100
  const word = tens >= 11 && tens <= 14 ? 'блюд' : last === 1 ? 'блюдо' : last >= 2 && last <= 4 ? 'блюда' : 'блюд'
  return `${n} ${word}`
}

// Меню в виде, готовом для шаблона.
const viewMenu = menu => menu.map(category => ({
  id: category.id,
  name: category.name_ru,
  visible: category.is_visible,
  count: dishCount(category.dishes.length),
  dishes: category.dishes.map(dish => ({
    id: dish.id,
    name: dish.name_ru,
    price: formatPrice(dish.price),
    thumb: dish.image ? imageUrl(dish.image, THUMB_WIDTH) : null,
    visible: dish.is_visible
  }))
}))

export default async function menuRoutes(app) {
  const { db } = app

  app.get('/', async (request, reply) => reply.admin('menu', { ...PAGE, categories: viewMenu(getAdminMenu(db)) }))

  app.post('/api/categories/order', { schema: schema.categoryOrder }, async (request, reply) =>
    reorderCategories(db, request.body.ids) ? OK : reply.code(400).send(STALE))

  app.post('/api/dishes/order', { schema: schema.dishOrder }, async (request, reply) => {
    const { categoryId, ids } = request.body
    if (!getCategory(db, categoryId)) return reply.code(404).send(NOT_FOUND)
    return reorderDishes(db, categoryId, ids) ? OK : reply.code(400).send(STALE)
  })

  app.post('/api/categories/:id/visibility', { schema: schema.visibility }, async (request, reply) =>
    setCategoryVisible(db, request.params.id, request.body.visible) ? OK : reply.code(404).send(NOT_FOUND))

  app.post('/api/dishes/:id/visibility', { schema: schema.visibility }, async (request, reply) =>
    setDishVisible(db, request.params.id, request.body.visible) ? OK : reply.code(404).send(NOT_FOUND))
}
