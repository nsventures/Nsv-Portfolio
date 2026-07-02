type LenisLike = { stop: () => void; start: () => void }

let lenis: LenisLike | null = null

export function registerLenis(instance: LenisLike | null) {
  lenis = instance
}

export function pauseSmoothScroll() {
  lenis?.stop()
  document.body.classList.add('portfolio-modal-open')
  document.body.style.overflow = 'hidden'
}

export function resumeSmoothScroll() {
  lenis?.start()
  document.body.classList.remove('portfolio-modal-open')
  document.body.style.overflow = ''
}
