import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export const IMAGE_WIDTHS = {
  dish: [400, 800],
  hero: [1200, 2000],
  about: [800, 1400],
  gallery: [800, 1400]
}

const WEBP_QUALITY = 80
const SAFE_ID = /^[A-Za-z]+-[A-Za-z0-9-]+$/

export class ImageError extends Error {
  constructor(options) {
    super('Не удалось прочитать фото, сохраните его как JPEG или PNG', options)
    this.name = 'ImageError'
  }
}

export const imageKind = id => id.split('-')[0]

export const imageUrl = (id, width) => `/uploads/${id}-${width}.webp`

export const imageSrcset = id =>
  IMAGE_WIDTHS[imageKind(id)].map(width => `${imageUrl(id, width)} ${width}w`).join(', ')

export function createImageStore({ dir, log }) {
  fs.mkdirSync(dir, { recursive: true })

  const fileOf = (id, width) => path.join(dir, `${id}-${width}.webp`)

  async function unlinkAll(id, widths) {
    for (const width of widths) {
      try {
        await fs.promises.unlink(fileOf(id, width))
      } catch (err) {
        if (err.code !== 'ENOENT') log.warn({ err, id, width }, 'could not remove image file')
      }
    }
  }

  async function save(kind, buffer) {
    if (!Object.hasOwn(IMAGE_WIDTHS, kind)) throw new Error(`Unknown image kind: ${kind}`)

    const widths = IMAGE_WIDTHS[kind]
    let variants
    try {
      variants = await Promise.all(
        widths.map(width =>
          sharp(buffer)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer()
        )
      )
    } catch (err) {
      // Владельцу — понятный текст; в журнал — причина: битый файл, нехватка памяти или сбой libvips.
      log.warn({ err, kind }, 'could not process image')
      throw new ImageError({ cause: err })
    }

    const id = `${kind}-${randomUUID()}`
    const writes = await Promise.allSettled(
      variants.map((data, i) => fs.promises.writeFile(fileOf(id, widths[i]), data))
    )

    const failed = writes.find(result => result.status === 'rejected')
    if (failed) {
      await unlinkAll(id, widths)
      throw failed.reason
    }
    return id
  }

  async function remove(id) {
    if (!id) return
    const widths = SAFE_ID.test(id) ? IMAGE_WIDTHS[imageKind(id)] : undefined
    if (!widths) {
      log.warn({ id }, 'refusing to remove image with unknown id')
      return
    }
    await unlinkAll(id, widths)
  }

  return { save, remove }
}
