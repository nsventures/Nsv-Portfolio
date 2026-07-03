import { lazy, Suspense, useEffect, useState } from 'react'

import { PortfolioAccessProvider } from './context/PortfolioAccessContext'
import { useSiteProtection } from './hooks/useSiteProtection'
import { Navbar } from './components/layout/Navbar'
import { Hero } from './components/sections/Hero'
import { useLenis } from './hooks/useLenis'

const Portfolio = lazy(() =>
  import('./components/sections/Portfolio').then((m) => ({ default: m.Portfolio })),
)

const Footer = lazy(() =>
  import('./components/layout/Footer').then((m) => ({ default: m.Footer })),
)

const FloatingActions = lazy(() =>
  import('./components/layout/FloatingActions').then((m) => ({ default: m.FloatingActions })),
)

const CursorFollower = lazy(() =>
  import('./components/ui/CursorFollower').then((m) => ({ default: m.CursorFollower })),
)

const ProjectInquiryModal = lazy(() =>
  import('./components/ui/ProjectInquiryModal').then((m) => ({
    default: m.ProjectInquiryModal,
  })),
)

const PortfolioCallbackModal = lazy(() =>
  import('./components/ui/PortfolioCallbackModal').then((m) => ({
    default: m.PortfolioCallbackModal,
  })),
)

function DeferredCursorFollower() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(() => setReady(true), { timeout: 3000 })
        : window.setTimeout(() => setReady(true), 1500)

    return () => {
      if (typeof cancelIdleCallback !== 'undefined' && typeof id === 'number') {
        cancelIdleCallback(id)
      } else {
        clearTimeout(id as number)
      }
    }
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <CursorFollower />
    </Suspense>
  )
}

export default function PublicApp() {
  useLenis()
  useSiteProtection()

  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [callbackOpen, setCallbackOpen] = useState(false)

  return (
    <PortfolioAccessProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-cyan focus:text-navy"
      >
        Skip to main content
      </a>

      <DeferredCursorFollower />

      <Navbar onCallbackClick={() => setCallbackOpen(true)} />

      <main id="main-content">
        <Hero />

        <Suspense fallback={<div className="min-h-[50vh] bg-off-white" aria-hidden />}>
          <Portfolio />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <FloatingActions />
      </Suspense>

      {inquiryOpen && (
        <Suspense fallback={null}>
          <ProjectInquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
        </Suspense>
      )}

      {callbackOpen && (
        <Suspense fallback={null}>
          <PortfolioCallbackModal onClose={() => setCallbackOpen(false)} />
        </Suspense>
      )}
    </PortfolioAccessProvider>
  )
}
