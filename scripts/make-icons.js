// Рисует иконки кабинета (public/img/icon-192.png, icon-512.png). Запуск: node scripts/make-icons.js
import path from 'node:path'
import sharp from 'sharp'

const OUT_DIR = path.join(import.meta.dirname, '..', 'public', 'img')
const SIZES = [192, 512]

// Слово лежит в центральной части: на круглых масках Android края не обрезаются.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0F241A"/>
  <text x="256" y="287" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, 'Liberation Serif', 'DejaVu Serif', serif"
        font-size="92" font-weight="700" letter-spacing="6" fill="#E2C99A">YAQIN</text>
</svg>`

for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon-${size}.png`)
  await sharp(Buffer.from(svg), { density: 72 * size / 512 }).resize(size, size).png().toFile(file)
  console.log(`Written ${file}`)
}
