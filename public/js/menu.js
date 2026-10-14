// Страница меню: подсветка вкладок при прокрутке и нижняя карточка блюда на телефоне.
(() => {
  const bar = document.querySelector('.tabs')
  const strip = document.querySelector('.tabs-bar')
  const sheet = document.querySelector('.sheet')
  const header = document.querySelector('.site-header__bar')
  if (!bar || !strip || !sheet || !header) return

  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const behavior = () => (reduced.matches ? 'auto' : 'smooth')

  /* ---------- Вкладки ---------- */
  const tabs = [...bar.querySelectorAll('.tab')]
  const sections = tabs.map(tab => document.getElementById('cat-' + tab.dataset.tab))
  let current = -1
  let lockUntil = 0

  // Сколько места сверху занимают шапка и полоса вкладок — по их фактической высоте.
  const offset = () => header.offsetHeight + strip.offsetHeight

  const mark = i => {
    current = i
    tabs.forEach((tab, n) => {
      tab.classList.toggle('is-active', n === i)
      if (n === i) tab.setAttribute('aria-current', 'true')
      else tab.removeAttribute('aria-current')
    })
  }

  const centerTab = i => {
    const tab = tabs[i]
    bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.offsetWidth / 2, behavior: behavior() })
  }

  const spy = () => {
    if (Date.now() < lockUntil) return
    let i = 0
    sections.forEach((section, n) => {
      if (section.getBoundingClientRect().top - offset() - 40 <= 0) i = n
    })
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) i = sections.length - 1
    if (i !== current) {
      mark(i)
      centerTab(i)
    }
  }

  let queued = false
  addEventListener('scroll', () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      spy()
    })
  }, { passive: true })
  addEventListener('resize', spy)

  bar.addEventListener('click', event => {
    const tab = event.target.closest('.tab')
    if (!tab) return
    event.preventDefault()
    const i = tabs.indexOf(tab)
    lockUntil = Date.now() + 900 // пока идёт плавная прокрутка, подсветку не трогаем
    scrollTo({ top: sections[i].getBoundingClientRect().top + scrollY - offset() + 30, behavior: behavior() })
    mark(i)
    centerTab(i)
  })

  spy()

  /* ---------- Нижняя карточка блюда ---------- */
  const narrow = matchMedia('(max-width: 599px)')
  const active = () => narrow.matches && typeof sheet.showModal === 'function'
  const cards = [...document.querySelectorAll('.dish')]
  const part = name => sheet.querySelector('.sheet__' + name)
  const body = part('body')
  const img = part('img')
  const placeholder = sheet.querySelector('.ph')

  const fill = (target, source) => target.replaceChildren(...source.cloneNode(true).childNodes)

  const open = card => {
    if (sheet.open) return
    const photo = card.querySelector('.dish__media img')
    if (photo) {
      img.srcset = photo.getAttribute('srcset')
      img.src = photo.getAttribute('src')
      img.alt = photo.alt
    }
    img.hidden = !photo
    placeholder.hidden = !!photo
    fill(part('name'), card.querySelector('.dish__name'))
    fill(part('desc'), card.querySelector('.dish__desc'))
    fill(part('amount'), card.querySelector('.dish__amount'))
    fill(part('price'), card.querySelector('.dish__price'))
    sheet.showModal()
    body.scrollTop = 0
    history.pushState({ sheet: card.dataset.dishId }, '', '#dish-' + card.dataset.dishId)
  }

  // Закрываем через историю: запись #dish-<id> уходит, а popstate закрывает окно.
  const dismiss = () => {
    if (sheet.open) history.back()
  }

  addEventListener('popstate', () => {
    if (sheet.open) sheet.close()
  })
  sheet.addEventListener('close', () => {
    sheet.style.transform = ''
  })
  sheet.addEventListener('cancel', event => {
    event.preventDefault()
    dismiss()
  })
  sheet.addEventListener('click', event => {
    if (event.target === sheet) dismiss()
  })
  part('close').addEventListener('click', dismiss)

  // Свайп вниз: тянем окно за пальцем, если содержимое прокручено к началу.
  let startY = null
  let dy = 0
  let dragging = false
  sheet.addEventListener('touchstart', event => {
    startY = body.scrollTop === 0 ? event.touches[0].clientY : null
    dy = 0
    dragging = false
  }, { passive: true })
  sheet.addEventListener('touchmove', event => {
    if (startY === null) return
    dy = event.touches[0].clientY - startY
    if (dy < 10 || body.scrollTop > 0) return
    event.preventDefault()
    dragging = true
    sheet.classList.add('is-dragging')
    sheet.style.transform = `translateY(${dy}px)`
  }, { passive: false })
  const release = () => {
    if (startY === null) return
    startY = null
    sheet.classList.remove('is-dragging')
    if (dragging && dy > 80) dismiss()
    else sheet.style.transform = ''
  }
  sheet.addEventListener('touchend', release)
  sheet.addEventListener('touchcancel', release)

  // Роль кнопки у карточек нужна только там, где они открывают окно.
  const sync = () => {
    cards.forEach(card => {
      if (active()) {
        card.setAttribute('role', 'button')
        card.setAttribute('aria-haspopup', 'dialog')
        card.tabIndex = 0
      } else {
        card.removeAttribute('role')
        card.removeAttribute('aria-haspopup')
        card.removeAttribute('tabindex')
      }
    })
    if (!active()) dismiss()
  }
  narrow.addEventListener('change', sync)
  sync()

  document.addEventListener('click', event => {
    const card = active() && event.target.closest('.dish')
    if (card) open(card)
  })
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && active() && event.target.matches('.dish')) {
      event.preventDefault()
      open(event.target)
    }
  })
})()
