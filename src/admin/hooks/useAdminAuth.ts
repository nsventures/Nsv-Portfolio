import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

interface AdminAuthState {
  session: Session | null
  user: User | null
  isAdmin: boolean
  loading: boolean
  error: string | null
}

export function useAdminAuth() {
  const initialLoadDone = useRef(false)

  const [state, setState] = useState<AdminAuthState>({
    session: null,
    user: null,
    isAdmin: false,
    loading: true,
    error: null,
  })

  const checkAdmin = useCallback(async (userId: string) => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return Boolean(data)
  }, [])

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? initialLoadDone.current

    if (!isSupabaseConfigured()) {
      setState({
        session: null,
        user: null,
        isAdmin: false,
        loading: false,
        error: 'Supabase is not configured.',
      })
      initialLoadDone.current = true
      return
    }

    if (!silent) {
      setState((s) => ({ ...s, loading: true, error: null }))
    }

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      const session = data.session
      if (!session?.user) {
        setState({
          session: null,
          user: null,
          isAdmin: false,
          loading: false,
          error: null,
        })
        initialLoadDone.current = true
        return
      }

      const isAdmin = await checkAdmin(session.user.id)
      setState({
        session,
        user: session.user,
        isAdmin,
        loading: false,
        error: null,
      })
      initialLoadDone.current = true
    } catch (err) {
      setState({
        session: null,
        user: null,
        isAdmin: false,
        loading: false,
        error: err instanceof Error ? err.message : 'Auth check failed',
      })
      initialLoadDone.current = true
    }
  }, [checkAdmin])

  useEffect(() => {
    refresh()

    if (!isSupabaseConfigured()) return

    const supabase = getSupabase()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return
      void refresh({ silent: true })
    })

    return () => subscription.unsubscribe()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    setState((s) => ({ ...s, loading: true, error: null }))

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }))
      throw error
    }

    if (!data.user) {
      const message = 'Sign in failed.'
      setState((s) => ({ ...s, loading: false, error: message }))
      throw new Error(message)
    }

    const isAdmin = await checkAdmin(data.user.id)
    if (!isAdmin) {
      await supabase.auth.signOut()
      const message = 'This account is not authorized for admin access.'
      setState({
        session: null,
        user: null,
        isAdmin: false,
        loading: false,
        error: message,
      })
      throw new Error(message)
    }

    await refresh()
  }, [checkAdmin, refresh])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setState({
      session: null,
      user: null,
      isAdmin: false,
      loading: false,
      error: null,
    })
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/login`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  return { ...state, signIn, signOut, refresh, resetPassword, updatePassword }
}
