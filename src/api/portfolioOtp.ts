import { FunctionsHttpError } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface PortfolioOtpSendPayload {
  name: string
  email: string
  phone: string
  projectName?: string | null
  siteOrigin?: string
}

export interface PortfolioOtpSendResult {
  expiresIn: number
  emailMasked: string
  phoneMasked: string
  whatsappSent: boolean
  whatsappError?: string | null
  whatsappDispatchToken?: string | null
}

function authyoRelayUrl(): string {
  const configured = import.meta.env.VITE_AUTHYO_RELAY_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return '/api/authyo/send-otp'
}

async function dispatchWhatsappOtp(token: string, origin: string) {
  const res = await fetch(authyoRelayUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, origin }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
  }

  if (!res.ok || body.ok !== true) {
    const err = body.error ?? 'WhatsApp relay failed'
    const relayOffline =
      res.status === 503 ||
      err.toLowerCase().includes('not configured') ||
      err.toLowerCase().includes('relay not configured')
    return {
      whatsappSent: false,
      whatsappError: relayOffline
        ? import.meta.env.PROD
          ? 'WhatsApp relay not configured on Vercel — add OTP_HASH_SECRET, AUTHYO_CLIENT_ID, AUTHYO_CLIENT_SECRET env vars and redeploy.'
          : 'WhatsApp relay offline — add Authyo secrets to .env.local and run npm run dev:all'
        : err,
    }
  }

  return { whatsappSent: true, whatsappError: null as string | null }
}

export interface PortfolioOtpVerifyPayload {
  email: string
  otp: string
}

export interface PortfolioOtpVerifyResult {
  name: string
  email: string
  phone: string
  verifiedAt: string
  accessToken: string
  expiresAt: string
  expiresIn: number
}

type EdgeOk<T> = { ok: true } & T
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
      // ignore JSON parse errors
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message)
    if (message && !message.includes('non-2xx')) return message
  }

  return 'Verification service unavailable. Check edge function secrets and try again.'
}

function isEdgeOk(data: unknown): data is EdgeOk<Record<string, unknown>> {
  return Boolean(data && typeof data === 'object' && (data as EdgeOk<unknown>).ok === true)
}

export async function sendPortfolioEmailOtp(
  payload: PortfolioOtpSendPayload,
): Promise<PortfolioOtpSendResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke('portfolio-otp-send', {
    body: {
      ...payload,
      siteOrigin: payload.siteOrigin ?? window.location.origin,
    },
  })

  if (!isEdgeOk(data)) {
    throw new Error(await parseEdgeError(error, data))
  }

  const result = data as unknown as EdgeOk<
    PortfolioOtpSendResult & { whatsappDispatchToken?: string | null }
  >

  let whatsappSent = result.whatsappSent ?? false
  let whatsappError = result.whatsappError ?? null

  if (result.whatsappDispatchToken) {
    const relay = await dispatchWhatsappOtp(
      result.whatsappDispatchToken,
      payload.siteOrigin ?? window.location.origin,
    )
    whatsappSent = relay.whatsappSent
    whatsappError = relay.whatsappError
  }

  return {
    expiresIn: result.expiresIn,
    emailMasked: result.emailMasked,
    phoneMasked: result.phoneMasked,
    whatsappSent,
    whatsappError,
  }
}

export async function verifyPortfolioEmailOtp(
  payload: PortfolioOtpVerifyPayload,
): Promise<PortfolioOtpVerifyResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke('portfolio-otp-verify', {
    body: payload,
  })

  if (!isEdgeOk(data)) {
    throw new Error(await parseEdgeError(error, data))
  }

  const result = data as unknown as EdgeOk<{ profile: PortfolioOtpVerifyResult }>
  return result.profile
}
