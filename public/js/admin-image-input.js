// Поле фото: перед отправкой уменьшает снимок в браузере и показывает предпросмотр.
// Если браузер не смог открыть файл, остаётся оригинал: сервер сам приведёт его к нужным размерам.

const MAX_SIDE = 2000
const JPEG_QUALITY = 0.85

// Размер, в который вписывается снимок: длинная сторона не больше max, увеличения нет.
export function fitWithin(width, height, max) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

async function downscale(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    // JPEG без прозрачности: под PNG с прозрачным фоном нужен светлый фон, а не чёрный.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('toBlob failed')
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

function showPreview(preview, file) {
  if (!preview) return
  if (preview.src.startsWith('blob:')) URL.revokeObjectURL(preview.src)
  if (!file) {
    preview.hidden = true
    preview.removeAttribute('src')
    return
  }
  preview.hidden = false
  preview.src = URL.createObjectURL(file)
}

function setup(input) {
  const preview = input.closest('.field')?.querySelector('.preview')
  // Формат, который браузер не показывает (например HEIC), — предпросмотра нет, но файл уйдёт на сервер как есть.
  preview?.addEventListener('error', () => { preview.hidden = true })

  input.addEventListener('change', async () => {
    const original = input.files?.[0]
    if (!original) return showPreview(preview, null)

    let chosen = original
    try {
      const small = await downscale(original)
      // Пока шло уменьшение, могли выбрать другой файл.
      if (input.files?.[0] !== original) return
      const transfer = new DataTransfer()
      transfer.items.add(small)
      input.files = transfer.files
      chosen = small
    } catch {
      // оставляем исходный файл
    }
    showPreview(preview, chosen)
  })
}

export function init() {
  document.querySelectorAll('[data-image-input]').forEach(setup)
}
