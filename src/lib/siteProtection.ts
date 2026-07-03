function parseEnvFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

/** When true, public site blocks copy, right-click, and common devtools shortcuts. */
export function isSiteProtectionEnabled(): boolean {
  return parseEnvFlag(import.meta.env.VITE_IS_PRODUCTION)
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

export function attachSiteProtection(): () => void {
  document.body.classList.add('site-protection-enabled')

  const onContextMenu = (event: MouseEvent) => {
    if (isEditableTarget(event.target)) return
    event.preventDefault()
  }

  const onClipboard = (event: ClipboardEvent) => {
    if (isEditableTarget(event.target)) return
    event.preventDefault()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return

    const key = event.key.toLowerCase()
    const ctrlOrMeta = event.ctrlKey || event.metaKey

    if (key === 'f12') {
      event.preventDefault()
      return
    }

    if (event.shiftKey && ctrlOrMeta && ['i', 'j', 'c', 'k'].includes(key)) {
      event.preventDefault()
      return
    }

    if (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) {
      event.preventDefault()
      return
    }

    if (ctrlOrMeta && (key === 'u' || key === 's')) {
      event.preventDefault()
    }
  }

  const onDragStart = (event: DragEvent) => {
    if (isEditableTarget(event.target)) return
    event.preventDefault()
  }

  document.addEventListener('contextmenu', onContextMenu)
  document.addEventListener('copy', onClipboard)
  document.addEventListener('cut', onClipboard)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('dragstart', onDragStart)

  return () => {
    document.body.classList.remove('site-protection-enabled')
    document.removeEventListener('contextmenu', onContextMenu)
    document.removeEventListener('copy', onClipboard)
    document.removeEventListener('cut', onClipboard)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('dragstart', onDragStart)
  }
}
