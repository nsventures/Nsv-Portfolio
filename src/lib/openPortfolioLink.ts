/** Navigate to the portfolio link in the same tab. */
export function openPortfolioEntry(entry: { link: string }): 'opened' | 'missing' {
  const url = entry.link?.trim()
  if (!url) return 'missing'
  window.location.assign(url)
  return 'opened'
}
