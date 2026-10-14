import { randomBytes } from 'node:crypto'
import { SESSION_TTL_MS } from '../services/auth.js'

export function createSession(db, userId, now = new Date()) {
  const id = randomBytes(32).toString('hex')
  const expires_at = new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expires_at)
  return { id, expires_at }
}

// expires_at хранится ISO-строкой из JS, поэтому и сравниваем с ISO-строкой из JS, а не с datetime('now').
export function findSessionUser(db, id, now = new Date()) {
  if (typeof id !== 'string') return undefined
  return db.prepare(`
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(id, now.toISOString())
}

export function deleteSession(db, id) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function deleteOtherSessions(db, userId, keepId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(userId, keepId)
}

export function deleteAllSessions(db, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export function deleteExpiredSessions(db, now = new Date()) {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes
}
