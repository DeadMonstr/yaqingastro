import { hashPassword, verifyPassword } from '../../services/auth.js'
import { getUser, setPasswordHash } from '../../repos/users.js'
import { deleteOtherSessions } from '../../repos/sessions.js'

const PAGE = { section: 'account', title: 'Аккаунт' }
const MIN_PASSWORD = 8

const text = value => (typeof value === 'string' ? value : '')

export default async function accountRoutes(app) {
  app.get('/account', async (request, reply) => reply.admin('account', { ...PAGE, errors: {} }))

  app.post('/account/password', async (request, reply) => {
    const body = request.body ?? {}
    const current = text(body.current), password = text(body.password), repeat = text(body.repeat)
    const user = getUser(app.db, request.user.id)

    const errors = {}
    if (!await verifyPassword(current, user?.password_hash)) errors.current = 'Неверный текущий пароль'
    if ([...password].length < MIN_PASSWORD) errors.password = 'Не короче 8 символов'
    if (repeat !== password) errors.repeat = 'Пароли не совпадают'
    if (Object.keys(errors).length) return reply.admin('account', { ...PAGE, errors }, 400)

    setPasswordHash(app.db, user.id, await hashPassword(password))
    deleteOtherSessions(app.db, user.id, request.sessionId)
    return reply.redirect('/admin/account?saved=1')
  })
}
