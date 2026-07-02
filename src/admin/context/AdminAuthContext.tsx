import { createContext, useContext, type ReactNode } from 'react'

import { useAdminAuth } from '../hooks/useAdminAuth'

type AdminAuthContextValue = ReturnType<typeof useAdminAuth>

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const auth = useAdminAuth()
  return <AdminAuthContext.Provider value={auth}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuthContext() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuthContext must be used within AdminAuthProvider')
  }
  return ctx
}
