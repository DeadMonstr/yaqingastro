import sharp from 'sharp'

export async function jpeg({ width = 1200, height = 900, orientation } = {}) {
  let image = sharp({ create: { width, height, channels: 3, background: '#c9a96e' } }).jpeg()
  if (orientation) image = image.withMetadata({ orientation })
  return image.toBuffer()
}
