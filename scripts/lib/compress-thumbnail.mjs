import sharp from 'sharp'

/** Keep in sync with src/lib/portfolioMedia.ts */
export const PORTFOLIO_THUMB_MAX_WIDTH = 560 * 2
export const PORTFOLIO_THUMB_MAX_HEIGHT = 420 * 2
export const THUMB_WEBP_QUALITY = 82
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
    .webp({ quality: THUMB_WEBP_QUALITY, effort: 4 })
    .toBuffer()
}
