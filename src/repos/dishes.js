const toDish = row => row && { ...row, is_visible: row.is_visible === 1 }

const fields = input => ({
  category_id: input.category_id,
  name_ru: input.name_ru,
  name_uz: input.name_uz,
  name_en: input.name_en,
  desc_ru: input.desc_ru,
  desc_uz: input.desc_uz,
  desc_en: input.desc_en,
  amount: input.amount ?? null,
  unit: input.unit ?? null,
  price: input.price,
  image: input.image ?? null,
  is_visible: input.is_visible ? 1 : 0
})

export function listDishes(db, categoryId) {
  return db.prepare('SELECT * FROM dishes WHERE category_id = ? ORDER BY sort_order, id').all(categoryId).map(toDish)
}

export function getDish(db, id) {
  return toDish(db.prepare('SELECT * FROM dishes WHERE id = ?').get(id))
}

export function countDishes(db, categoryId) {
  return db.prepare('SELECT COUNT(*) AS n FROM dishes WHERE category_id = ?').get(categoryId).n
}

export function createDish(db, input) {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO dishes (category_id, name_ru, name_uz, name_en, desc_ru, desc_uz, desc_en,
                        amount, unit, price, image, is_visible, sort_order)
    VALUES (@category_id, @name_ru, @name_uz, @name_en, @desc_ru, @desc_uz, @desc_en,
            @amount, @unit, @price, @image, @is_visible,
            (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM dishes WHERE category_id = @category_id))
  `).run(fields(input))
  return getDish(db, lastInsertRowid)
}

// In SET, column references read the old row: a dish keeps its place within its
// category and goes to the end of the new one when category_id changes.
export function updateDish(db, id, input) {
  db.prepare(`
    UPDATE dishes
    SET sort_order = CASE WHEN category_id = @category_id THEN sort_order
                          ELSE (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM dishes WHERE category_id = @category_id) END,
        category_id = @category_id,
        name_ru = @name_ru, name_uz = @name_uz, name_en = @name_en,
        desc_ru = @desc_ru, desc_uz = @desc_uz, desc_en = @desc_en,
        amount = @amount, unit = @unit, price = @price, image = @image,
        is_visible = @is_visible, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...fields(input), id })
  return getDish(db, id)
}

export function deleteDish(db, id) {
  return toDish(db.prepare('DELETE FROM dishes WHERE id = ? RETURNING *').get(id))
}

export function setDishVisible(db, id, visible) {
  const { changes } = db.prepare(`
    UPDATE dishes SET is_visible = ?, updated_at = datetime('now') WHERE id = ?
  `).run(visible ? 1 : 0, id)
  return changes > 0
}

export function reorderDishes(db, categoryId, ids) {
  const existing = db.prepare('SELECT id FROM dishes WHERE category_id = ?').all(categoryId).map(row => row.id)
  const given = new Set(ids)
  if (given.size !== ids.length || ids.length !== existing.length || !existing.every(id => given.has(id))) return false

  const update = db.prepare(`UPDATE dishes SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`)
  db.transaction(() => ids.forEach((id, index) => update.run(index + 1, id)))()
  return true
}
