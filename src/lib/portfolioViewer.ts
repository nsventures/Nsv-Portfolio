import { isDirectVideoUrl, isYoutubeLink, youtubeEmbedUrl, youtubeVideoId } from './portfolioLink'

export type PortfolioViewerMode = 'native-video' | 'iframe'

export type PortfolioViewerSrc = {
  mode: PortfolioViewerMode
  src: string
  /** True when src is a YouTube embed (UI can shield logo / outbound links). */
  youtube?: boolean
  youtubeVideoId?: string
}

export function getPortfolioViewerSrc(entry: {
  link: string
  mediaType: 'video' | 'virtual-tour'
}): PortfolioViewerSrc | null {
  const link = entry.link?.trim()
  if (!link) return null

  if (entry.mediaType === 'video' && isDirectVideoUrl(link)) {
    return { mode: 'native-video', src: link }
  }

  if (entry.mediaType === 'video' && isYoutubeLink(link)) {
    const id = youtubeVideoId(link)
    const embed = youtubeEmbedUrl(link)
    if (embed && id) return { mode: 'iframe', src: embed, youtube: true, youtubeVideoId: id }
  }

  return { mode: 'iframe', src: link }
}
