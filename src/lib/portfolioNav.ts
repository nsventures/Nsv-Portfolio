import type { PortfolioMediaType } from '../types/portfolio'

export function parseMediaFilter(hash: string): PortfolioMediaType {
  if (hash === '#virtual-tours') return 'virtual-tour'
  return 'video'
}

export function scrollToPortfolioFilter(filter: PortfolioMediaType) {
  window.location.hash = filter === 'video' ? 'video' : 'virtual-tours'
  window.dispatchEvent(new CustomEvent('portfolio-filter', { detail: filter }))
  document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })
}
