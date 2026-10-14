const CSRF_FIELD = /name="_csrf" value="([^"]+)"/

export function getCsrf(html) {
  const match = CSRF_FIELD.exec(html)
  if (!match) throw new Error('No _csrf field in the page')
  return match[1]
}

export function form(fields) {
  return {
    payload: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  }
}

// Тело multipart/form-data как у браузера: строки — текстовые поля, объект { filename, content, type } — файл.
export function multipart(fields) {
  const boundary = '----yaqin-test-boundary'
  const chunks = []
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
    } else {
      chunks.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${value.filename}"\r\nContent-Type: ${value.type}\r\n\r\n`),
        value.content,
        Buffer.from('\r\n')
      )
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

// «name=value» из заголовков Set-Cookie ответа (значение остаётся закодированным, как его отдал сервер).
export function cookiePair(res, name) {
  const header = [].concat(res.headers['set-cookie'] ?? []).find(line => line.startsWith(`${name}=`))
  if (!header) throw new Error(`No ${name} cookie in the response`)
  return header.split(';')[0]
}

// Вход как в браузере: страница входа даёт токен и cookie _csrf, POST даёт cookie sid.
export async function loginAs(app, { login = 'admin', password = 'secret-pass-1' } = {}) {
  const page = await app.inject('/admin/login')
  const csrf = getCsrf(page.body)
  const csrfCookie = cookiePair(page, '_csrf')
  const res = await app.inject({
    method: 'POST',
    url: '/admin/login',
    headers: { cookie: csrfCookie, ...form({}).headers },
    payload: form({ _csrf: csrf, login, password, next: '' }).payload
  })
  if (res.statusCode !== 302) throw new Error(`Login failed with status ${res.statusCode}`)
  return { cookie: `${cookiePair(res, 'sid')}; ${csrfCookie}`, csrf }
}
