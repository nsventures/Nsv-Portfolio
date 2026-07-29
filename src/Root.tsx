import { lazy, Suspense, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { AdminProductionGate } from './admin/components/AdminProductionGate'
import { getSupabase, isSupabaseConfigured } from './lib/supabase'
import PublicApp from './PublicApp'

const AdminApp = lazy(() => import('./admin/AdminApp'))

function VercelAnalytics() {
  const { pathname, search } = useLocation()
  return <Analytics route={pathname} path={pathname + search} />
}

// Supabase's recovery-link redirect only lands on /admin/login when that
// exact URL is allow-listed in the dashboard's Redirect URLs. If it isn't,
// Supabase falls back to the Site URL (the public homepage) and the recovery
// session is established there with no UI to act on it. This catches that
// case anywhere in the app and forwards to the admin password form.
function AuthRecoveryRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = getSupabase()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/admin/login', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return null
}

export default function Root() {
  return (
    <BrowserRouter>
      <VercelAnalytics />
      <AuthRecoveryRedirect />
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
