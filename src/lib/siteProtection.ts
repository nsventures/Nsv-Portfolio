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

const DEVTOOLS_SIZE_THRESHOLD = 160
const DEVTOOLS_CHECK_INTERVAL_MS = 600

function createDevToolsOverlay(): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.setAttribute('role', 'alertdialog')
  overlay.setAttribute('aria-live', 'assertive')
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'text-align:center',
    'padding:24px',
    'background:rgba(0,15,30,0.92)',
    'backdrop-filter:blur(14px)',
    '-webkit-backdrop-filter:blur(14px)',
    'color:#fff',
    'font-family:system-ui,-apple-system,sans-serif',
    'font-size:16px',
    'font-weight:600',
    'line-height:1.5',
  ].join(';')
  overlay.textContent = 'Please close developer tools to continue viewing this site.'
  return overlay
}

function attachDevToolsGuard(): () => void {
  let overlay: HTMLDivElement | null = null
  let consoleProbeTripped = false

  // Reading `.id` only happens if DevTools is actually inspecting the logged
  // object — this fires whether DevTools is docked or a separate window,
  // unlike the outerWidth/innerWidth size check below.
  const probe = new Image()
  Object.defineProperty(probe, 'id', {
    get() {
      consoleProbeTripped = true
      return ''
    },
  })

  const isDevToolsOpen = () => {
    const sizeFlag =
      window.outerWidth - window.innerWidth > DEVTOOLS_SIZE_THRESHOLD ||
      window.outerHeight - window.innerHeight > DEVTOOLS_SIZE_THRESHOLD

    consoleProbeTripped = false
    // eslint-disable-next-line no-console
    console.log(probe)
    console.clear()

    return sizeFlag || consoleProbeTripped
  }

  const check = () => {
    if (isDevToolsOpen()) {
      if (!overlay) {
        overlay = createDevToolsOverlay()
        document.body.appendChild(overlay)
      }
    } else if (overlay) {
      overlay.remove()
      overlay = null
    }
  }

  check()
  const timer = window.setInterval(check, DEVTOOLS_CHECK_INTERVAL_MS)

  return () => {
    window.clearInterval(timer)
    overlay?.remove()
  }
}

export function attachSiteProtection(): () => void {
  document.body.classList.add('site-protection-enabled')
  const detachDevToolsGuard = attachDevToolsGuard()

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
    detachDevToolsGuard()
  }
}
