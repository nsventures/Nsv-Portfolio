import { FunctionsHttpError } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface PortfolioOtpSendPayload {
  name: string
  email: string
  phone: string
  projectName?: string | null
  siteOrigin?: string
  captchaToken?: string | null
}

export interface PortfolioOtpSendResult {
  expiresIn: number
  emailMasked: string
  phoneMasked: string
  emailSent: boolean
  whatsappSent: boolean
  whatsappError?: string | null
}

export interface PortfolioOtpVerifyPayload {
  email: string
  // phone: string // WhatsApp/phone-only verify (disabled — email OTP active)
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

export async function sendPortfolioOtp(
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
    PortfolioOtpSendResult & {
      emailMasked?: string
      phoneMasked?: string
      emailSent?: boolean
      whatsappSent?: boolean
      whatsappError?: string | null
    }
  >

  return {
    expiresIn: result.expiresIn,
    emailMasked: result.emailMasked ?? '',
    phoneMasked: result.phoneMasked ?? '',
    emailSent: result.emailSent ?? true,
    whatsappSent: result.whatsappSent ?? false,
    whatsappError: result.whatsappError ?? null,
  }
}

export async function verifyPortfolioOtp(
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
