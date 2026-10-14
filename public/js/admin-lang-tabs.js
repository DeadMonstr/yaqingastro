// Переключатель RU | UZ | EN: показывает поля одного языка, остальные прячет.
// Без JS (на <html> нет класса js) переключатель скрыт, а все поля видны.

const DEFAULT_LANG = 'ru'

function setup(tabs) {
  const scope = tabs.closest('form') ?? document
  const buttons = [...tabs.querySelectorAll('button[data-lang]')]
  const fields = [...scope.querySelectorAll('.field[data-lang]')]

  const withError = new Set(fields.filter(field => field.querySelector('.field-error')).map(field => field.dataset.lang))
  for (const button of buttons) {
    const hasError = withError.has(button.dataset.lang)
    button.classList.toggle('has-error', hasError)
    if (hasError) button.setAttribute('aria-label', `${button.textContent}, есть ошибка`)
  }

  function show(lang) {
    for (const field of fields) field.hidden = field.dataset.lang !== lang
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.lang === lang))
  }

  tabs.addEventListener('click', event => {
    const button = event.target.closest('button[data-lang]')
    if (button) show(button.dataset.lang)
  })

  // Открываем первую вкладку с ошибкой, иначе русскую.
  show(buttons.find(button => withError.has(button.dataset.lang))?.dataset.lang ?? DEFAULT_LANG)
}

export function init() {
  document.querySelectorAll('[data-lang-tabs]').forEach(setup)
}
