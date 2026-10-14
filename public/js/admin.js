const TOAST_MS = 3000
const ERROR_TOAST_MS = 6000
const FADE_MS = 250

function hideLater(el, ms) {
  setTimeout(() => {
    el.classList.add('toast--hide')
    setTimeout(() => el.remove(), FADE_MS)
  }, ms)
}

// Уведомление сверху экрана; ошибки висят дольше.
export function toast(text, isError = false) {
  const el = document.createElement('div')
  el.className = isError ? 'toast toast--error' : 'toast'
  el.setAttribute('role', isError ? 'alert' : 'status')
  el.textContent = text
  document.body.append(el)
  hideLater(el, isError ? ERROR_TOAST_MS : TOAST_MS)
  return el
}

// POST с JSON и токеном из <meta name="csrf-token">; при ошибке бросает Error с текстом сервера.
export async function postJson(url, body) {
  const token = document.querySelector('meta[name="csrf-token"]')?.content ?? ''
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify(body)
    })
  } catch {
    throw new Error('Нет связи. Проверьте интернет и повторите.')
  }
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json.error || 'Не удалось сохранить')
  return json
}

function init() {
  // «Сохранено» после редиректа: прячем через 3 секунды и убираем ?saved=1, чтобы обновление страницы его не повторяло.
  document.querySelectorAll('.toast').forEach(el => hideLater(el, TOAST_MS))
  const url = new URL(location.href)
  if (url.searchParams.has('saved')) {
    url.searchParams.delete('saved')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }

  document.addEventListener('submit', event => {
    const form = event.target
    if (form instanceof HTMLFormElement && form.dataset.confirm && !confirm(form.dataset.confirm)) {
      event.preventDefault()
    }
  })
}

// Модули экранов подключаются тем же адресом с ?v=...: иначе браузер возьмёт их из кэша недельной давности.
// Модуль не импортирует admin.js, а получает postJson и toast в init.
async function loadFeatures() {
  if (document.querySelector('.dish-list')) {
    const menu = await import('./admin-menu.js' + new URL(import.meta.url).search)
    menu.init({ postJson, toast })
  }
}

document.documentElement.classList.add('js')
init()
loadFeatures().catch(err => {
  console.error(err)
  toast('Страница загрузилась не полностью. Обновите её.', true)
})
