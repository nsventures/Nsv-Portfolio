/** e.g. "Mar 2024" for modal / card labels */
export function formatVideoPublishedDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}
