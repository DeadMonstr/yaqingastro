// Экран «Меню»: порядок категорий и блюд, видимость, запоминание раскрытых категорий.
// Модуль подключает admin.js и передаёт ему postJson и toast: сам admin.js он не импортирует.
// postJson бросает Error с текстом сервера или с сообщением «Нет связи…» — его и показываем владельцу.

const OPEN_KEY = 'yaqin-admin-open'
const SORT_ERROR = 'Не удалось сохранить порядок'
const SAVE_ERROR = 'Не удалось сохранить'

const idOf = (el, name) => Number(el.dataset[name])

function readOpen() {
  try {
    const ids = JSON.parse(localStorage.getItem(OPEN_KEY))
    return Array.isArray(ids) ? ids.map(Number) : []
  } catch {
    return []
  }
}

function writeOpen(ids) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(ids))
  } catch {
    // хранилище недоступно (приватный режим, запрет): экран работает, раскрытые блоки просто не запоминаются
  }
}

// Раскрытые категории запоминаются между посещениями.
function restoreOpen(cats) {
  const open = new Set(readOpen())
  const save = () => writeOpen(cats.filter(cat => cat.open).map(cat => idOf(cat, 'catId')))
  for (const cat of cats) {
    cat.open = open.has(idOf(cat, 'catId'))
    cat.addEventListener('toggle', save)
  }
}

// Нажатие на ручку или переключатель в заголовке не должно раскрывать и сворачивать блок.
function guardSummary(root) {
  root.addEventListener('click', event => {
    if (event.target.closest('.cat__head > .handle')) event.preventDefault()
  })
  root.querySelectorAll('.cat__head > .switch').forEach(el => el.addEventListener('click', event => event.stopPropagation()))
}

function initSwitches(root, { postJson, toast }) {
  root.addEventListener('change', async event => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || !input.dataset.visibilityUrl) return
    const visible = input.checked
    try {
      await postJson(input.dataset.visibilityUrl, { visible })
      input.closest('.dish, .cat').classList.toggle('is-hidden', !visible)
    } catch (err) {
      input.checked = !visible
      toast(err.message || SAVE_ERROR, true)
    }
  })
}

// Перетаскивание только за ручку: остальная строка остаётся для прокрутки пальцем.
// Пока порядок сохраняется, перетаскивание выключено; при ошибке на экран возвращается прежний порядок.
// При перетаскивании пальцем SortableJS кладёт в список свою копию строки (fallbackClass) ещё до onStart:
// в прежний порядок она не входит, иначе при ошибке вернулась бы в список и осталась висеть на экране.
function sortable(list, { draggable, handle, toBody, url }, { postJson, toast }) {
  let before = []
  const sorter = window.Sortable.create(list, {
    draggable,
    handle,
    animation: 150,
    onStart: () => { before = [...list.children].filter(el => !el.classList.contains(sorter.options.fallbackClass)) },
    async onEnd(event) {
      if (event.oldIndex === event.newIndex) return
      sorter.option('disabled', true)
      try {
        await postJson(url, toBody([...list.children]))
      } catch (err) {
        list.append(...before)
        toast(err.message || SORT_ERROR, true)
      } finally {
        sorter.option('disabled', false)
      }
    }
  })
}

export function init(api) {
  const root = document.querySelector('.cat-list')
  const cats = [...root.querySelectorAll(':scope > .cat')]

  restoreOpen(cats)
  guardSummary(root)
  initSwitches(root, api)

  // Не загрузился SortableJS: переключатели работают, порядок не меняется.
  if (!window.Sortable) return

  sortable(root, {
    draggable: '.cat',
    handle: '.cat__head > .handle',
    url: '/admin/api/categories/order',
    toBody: items => ({ ids: items.map(el => idOf(el, 'catId')) })
  }, api)

  for (const list of root.querySelectorAll('.dish-list')) {
    sortable(list, {
      draggable: '.dish',
      handle: '.handle',
      url: '/admin/api/dishes/order',
      toBody: items => ({ categoryId: idOf(list, 'categoryId'), ids: items.map(el => idOf(el, 'id')) })
    }, api)
  }
}
