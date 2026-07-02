import { Navigate, Outlet } from 'react-router-dom'

import { useAdminAuthContext } from '../context/AdminAuthContext'

export function AdminGuard() {
  const { session, isAdmin, loading } = useAdminAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin" />
      </div>
    )
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
