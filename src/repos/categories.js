const toCategory = row => row && { ...row, is_visible: row.is_visible === 1 }

export function listCategories(db) {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all().map(toCategory)
}

export function getCategory(db, id) {
  return toCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(id))
}

export function isSlugTaken(db, slug, exceptId = null) {
  const row = db.prepare('SELECT 1 FROM categories WHERE slug = ? AND (? IS NULL OR id <> ?)').get(slug, exceptId, exceptId)
  return row !== undefined
}

export function createCategory(db, input) {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO categories (slug, name_ru, name_uz, name_en, is_visible, sort_order)
    VALUES (@slug, @name_ru, @name_uz, @name_en, @is_visible,
            (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))
  `).run({
    slug: input.slug,
    name_ru: input.name_ru,
    name_uz: input.name_uz,
    name_en: input.name_en,
    is_visible: input.is_visible ? 1 : 0
  })
  return getCategory(db, lastInsertRowid)
}

export function updateCategory(db, id, input) {
  db.prepare(`
    UPDATE categories
    SET slug = @slug, name_ru = @name_ru, name_uz = @name_uz, name_en = @name_en,
        is_visible = @is_visible, updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    slug: input.slug,
    name_ru: input.name_ru,
    name_uz: input.name_uz,
    name_en: input.name_en,
    is_visible: input.is_visible ? 1 : 0
  })
  return getCategory(db, id)
}

export function deleteCategory(db, id) {
  if (!getCategory(db, id)) return 'not_found'
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM dishes WHERE category_id = ?').get(id)
  if (n > 0) return 'not_empty'
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  return 'deleted'
}

export function setCategoryVisible(db, id, visible) {
  const { changes } = db.prepare(`
    UPDATE categories SET is_visible = ?, updated_at = datetime('now') WHERE id = ?
  `).run(visible ? 1 : 0, id)
  return changes > 0
}

export function reorderCategories(db, ids) {
  const existing = db.prepare('SELECT id FROM categories').all().map(row => row.id)
  const given = new Set(ids)
  if (given.size !== ids.length || ids.length !== existing.length || !existing.every(id => given.has(id))) return false

  const update = db.prepare(`UPDATE categories SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`)
  db.transaction(() => ids.forEach((id, index) => update.run(index + 1, id)))()
  return true
}
