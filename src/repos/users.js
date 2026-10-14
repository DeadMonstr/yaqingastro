export function countUsers(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n
}

export function findUserByLogin(db, login) {
  return db.prepare('SELECT * FROM users WHERE login = ?').get(login)
}

export function getUser(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function createUser(db, login, passwordHash) {
  const { lastInsertRowid } = db.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)').run(login, passwordHash)
  return getUser(db, lastInsertRowid)
}

export function setPasswordHash(db, id, hash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id)
}
