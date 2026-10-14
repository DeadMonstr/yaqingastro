import { listCategories } from './categories.js'
import { listDishes } from './dishes.js'

export function getAdminMenu(db) {
  return listCategories(db).map(category => ({ ...category, dishes: listDishes(db, category.id) }))
}

export function getPublicMenu(db) {
  return getAdminMenu(db)
    .filter(category => category.is_visible)
    .map(category => ({ ...category, dishes: category.dishes.filter(dish => dish.is_visible) }))
    .filter(category => category.dishes.length > 0)
}
