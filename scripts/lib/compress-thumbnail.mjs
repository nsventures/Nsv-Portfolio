import sharp from 'sharp'

/** Keep in sync with src/lib/portfolioMedia.ts */
export const PORTFOLIO_THUMB_MAX_WIDTH = Math.round(560 * 1.5)
export const PORTFOLIO_THUMB_MAX_HEIGHT = Math.round(420 * 1.5)
export const THUMB_WEBP_QUALITY = 65
export const THUMB_WEBP_EXT = 'webp'

export const thumbStoragePath = (id) => `${id}.${THUMB_WEBP_EXT}`

/**
 * Resize (fit inside max box) and encode as WebP for portfolio thumbnails.
 * @param {Buffer | Uint8Array} input
 * @returns {Promise<Buffer>}
 */
export async function compressThumbnailBuffer(input) {
  return sharp(input)
    .rotate()
    .resize(PORTFOLIO_THUMB_MAX_WIDTH, PORTFOLIO_THUMB_MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_WEBP_QUALITY, effort: 6 })
    .toBuffer()
}
