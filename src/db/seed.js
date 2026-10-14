import { createCategory } from '../repos/categories.js'
import { createDish } from '../repos/dishes.js'
import { SEED_MENU } from './seed-data.js'

export function seedMenu(db) {
  db.transaction(() => {
    for (const cat of SEED_MENU) {
      const category = createCategory(db, {
        slug: cat.slug,
        name_ru: cat.name.ru,
        name_uz: cat.name.uz,
        name_en: cat.name.en,
        is_visible: true
      })
      for (const dish of cat.dishes) {
        createDish(db, {
          category_id: category.id,
          name_ru: dish.name.ru,
          name_uz: dish.name.uz,
          name_en: dish.name.en,
          desc_ru: dish.desc.ru,
          desc_uz: dish.desc.uz,
          desc_en: dish.desc.en,
          amount: dish.amount,
          unit: dish.unit,
          price: dish.price,
          image: null,
          is_visible: true
        })
      }
    }
  })()
}
