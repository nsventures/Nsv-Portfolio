import {
  PORTFOLIO_THUMB_MAX_HEIGHT,
  PORTFOLIO_THUMB_MAX_WIDTH,
  THUMB_WEBP_QUALITY,
} from './portfolioMedia'

function scaleToFit(width: number, height: number) {
  const scale = Math.min(
    1,
    PORTFOLIO_THUMB_MAX_WIDTH / width,
    PORTFOLIO_THUMB_MAX_HEIGHT / height,
  )
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Browser-side WebP compression before uploading to Supabase storage. */
export async function compressThumbnailFile(
  file: File | Blob,
  filename = 'thumbnail.webp',
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = scaleToFit(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas is not supported in this browser')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error('WebP encoding failed')),
      'image/webp',
      THUMB_WEBP_QUALITY / 100,
    )
  })

  return new File([blob], filename, { type: 'image/webp' })
}
