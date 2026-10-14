// Копия базы в data/backups/yaqin-ГГГГ-ММ-ДД-ЧЧММ.db. Запуск: npm run backup
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { loadConfig } from '../src/config.js'

const pad = n => String(n).padStart(2, '0')

// Локальное время процесса: в контейнере это время сервера.
function stamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export async function backupDatabase(dbFile, backupsDir, now = new Date()) {
  fs.mkdirSync(backupsDir, { recursive: true })
  const dest = path.join(backupsDir, `yaqin-${stamp(now)}.db`)
  const db = new Database(dbFile, { fileMustExist: true })
  try {
    await db.backup(dest)
  } finally {
    db.close()
  }
  return dest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const config = loadConfig()
    console.log(`Бэкап сохранён: ${await backupDatabase(config.dbFile, config.backupsDir)}`)
  } catch (err) {
    console.error(`Не удалось сделать бэкап: ${err.message}`)
    process.exit(1)
  }
}
