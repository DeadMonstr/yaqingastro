// Сброс пароля администратора. Запуск: npm run set-password -- <логин>
// Пароль берётся из NEW_PASSWORD или запрашивается без вывода на экран.
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../src/config.js'
import { openDb, migrate } from '../src/db/index.js'
import { hashPassword } from '../src/services/auth.js'
import { findUserByLogin, setPasswordHash } from '../src/repos/users.js'
import { deleteAllSessions } from '../src/repos/sessions.js'

const MIN_PASSWORD = 8

export async function setPassword(db, login, newPassword) {
  const user = findUserByLogin(db, login)
  if (!user) return 'not_found'
  if ([...newPassword].length < MIN_PASSWORD) return 'too_short'

  const hash = await hashPassword(newPassword)
  db.transaction(() => {
    setPasswordHash(db, user.id, hash)
    deleteAllSessions(db, user.id)
  })()
  return 'ok'
}

// Вводимые символы не печатаются: пароль не остаётся на экране и в истории терминала.
function askPassword() {
  let muted = false
  const output = new Writable({
    write(chunk, encoding, done) {
      if (!muted) process.stdout.write(chunk, encoding)
      done()
    }
  })
  const rl = readline.createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY })

  return new Promise(resolve => {
    rl.once('close', () => resolve(''))
    process.stdout.write('Новый пароль: ')
    muted = true
    rl.question('', answer => {
      process.stdout.write('\n')
      resolve(answer)
      rl.close()
    })
  })
}

const MESSAGES = {
  ok: 'Пароль изменён, все сессии завершены',
  not_found: 'Пользователь не найден',
  too_short: 'Пароль не короче 8 символов'
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const login = process.argv[2]
  if (!login) {
    console.error('Укажите логин: npm run set-password -- <логин>')
    process.exit(1)
  }

  let db
  try {
    const config = loadConfig()
    db = openDb(config.dbFile)
    migrate(db)
    const newPassword = process.env.NEW_PASSWORD ?? await askPassword()
    const result = await setPassword(db, login, newPassword)
    console[result === 'ok' ? 'log' : 'error'](MESSAGES[result])
    process.exitCode = result === 'ok' ? 0 : 1
  } catch (err) {
    console.error(`Не удалось изменить пароль: ${err.message}`)
    process.exitCode = 1
  } finally {
    db?.close()
  }
}
