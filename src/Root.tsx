import { lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'

import { AdminProductionGate } from './admin/components/AdminProductionGate'
import PublicApp from './PublicApp'

const AdminApp = lazy(() => import('./admin/AdminApp'))

function VercelAnalytics() {
  const { pathname, search } = useLocation()
  return <Analytics route={pathname} path={pathname + search} />
}

export default function Root() {
  return (
    <BrowserRouter>
      <VercelAnalytics />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen bg-navy-deep flex items-center justify-center text-cyan text-sm">
                  Loading admin…
                </div>
              }
            >
              <AdminProductionGate>
                <AdminApp />
              </AdminProductionGate>
            </Suspense>
          }
        />
        <Route path="/*" element={<PublicApp />} />
      </Routes>
    </BrowserRouter>
  )
}
