import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { countUsers, createUser } from '../repos/users.js'

const scryptAsync = promisify(scrypt)

const SALT_BYTES = 16
const KEY_BYTES = 64
const STORED_FORMAT = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function hashPassword(plain) {
  const salt = randomBytes(SALT_BYTES)
  const key = await scryptAsync(plain, salt, KEY_BYTES)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false
  const match = STORED_FORMAT.exec(stored)
  if (!match) return false

  const expected = Buffer.from(match[2], 'hex')
  const actual = await scryptAsync(plain, Buffer.from(match[1], 'hex'), KEY_BYTES)
  return timingSafeEqual(actual, expected)
}

export async function ensureAdmin(db, { adminLogin, adminPassword }, log) {
  if (countUsers(db) > 0) return 'exists'

  if (!adminLogin || !adminPassword) {
    log.warn('No admin user: set ADMIN_LOGIN and ADMIN_PASSWORD')
    return 'missing'
  }

  createUser(db, adminLogin, await hashPassword(adminPassword))
  log.info(`Admin user "${adminLogin}" created`)
  return 'created'
}
