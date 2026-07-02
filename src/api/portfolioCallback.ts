import { FunctionsHttpError } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface PortfolioCallbackPayload {
  name: string
  email: string
  phone: string
  message?: string | null
  projectName?: string | null
}

type EdgeErr = { ok: false; error: string }

async function parseEdgeError(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as EdgeErr).error
    if (typeof msg === 'string' && msg.trim()) return msg
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as EdgeErr | null
      if (body?.error?.trim()) return body.error
    } catch {
      // ignore
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message)
    if (message && !message.includes('non-2xx')) return message
  }

  return 'Could not send callback request. Please try again.'
}

export async function submitPortfolioCallback(
  payload: PortfolioCallbackPayload,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke('portfolio-callback', {
    body: payload,
  })

  if (!data || typeof data !== 'object' || !('ok' in data) || !(data as { ok: boolean }).ok) {
    throw new Error(await parseEdgeError(error, data))
  }
}
