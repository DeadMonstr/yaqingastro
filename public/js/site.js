(() => {
  const burger = document.querySelector('.burger')
  const panel = document.getElementById('mobile-nav')
  if (!burger || !panel) return

  const setOpen = open => {
    panel.hidden = !open
    burger.setAttribute('aria-expanded', String(open))
  }

  burger.addEventListener('click', () => setOpen(panel.hidden))
  panel.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false)
  })
})()
