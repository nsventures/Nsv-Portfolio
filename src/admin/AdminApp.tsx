import { Navigate, Route, Routes } from 'react-router-dom'

import { isSupabaseConfigured } from '../lib/supabase'
import { AdminGuard } from './components/AdminGuard'
import { AdminLayout } from './components/AdminLayout'
import { BulkImportProvider } from './context/BulkImportContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { BulkUploadPage } from './pages/BulkUploadPage'
import { CitiesPage } from './pages/CitiesPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { TourFormPage } from './pages/TourFormPage'
import { ToursPage } from './pages/ToursPage'

function SupabaseMissing() {
  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl font-bold text-white">Supabase not configured</h1>
        <p className="mt-3 text-sm text-white/50">
          Add <code className="text-cyan">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-cyan">VITE_SUPABASE_ANON_KEY</code> to{' '}
          <code className="text-cyan">.env.local</code>
        </p>
        <a href="/" className="inline-block mt-6 text-sm font-bold text-cyan hover:text-cyan-bright">
          ← Back to site
        </a>
      </div>
    </div>
  )
}

export default function AdminApp() {
  if (!isSupabaseConfigured()) {
    return <SupabaseMissing />
  }

  return (
    <AdminAuthProvider>
      <BulkImportProvider>
      <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tours" element={<ToursPage />} />
          <Route path="tours/new" element={<TourFormPage />} />
          <Route path="tours/:id/edit" element={<TourFormPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="bulk-upload" element={<BulkUploadPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      </BulkImportProvider>
    </AdminAuthProvider>
  )
}
