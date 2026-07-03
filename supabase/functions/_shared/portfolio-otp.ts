import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ ok: false, error: message }, status)
}

/** Normalize Indian mobile numbers to E.164 (+91XXXXXXXXXX). */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (digits.length === 13 && digits.startsWith('091')) return `+91${digits.slice(3)}`
  return null
}

/** Normalize phone to E.164 (+country + national). Accepts +prefix or legacy Indian formats. */
export function normalizePhoneE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`
    return null
  }

  return normalizeIndianPhone(trimmed)
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function generateOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

export async function hashOtp(otp: string, email: string): Promise<string> {
  const secret = Deno.env.get('OTP_HASH_SECRET')
  if (!secret) throw new Error('OTP_HASH_SECRET is not configured')

  const normalized = normalizeEmail(email)
  const data = new TextEncoder().encode(`${secret}:${normalized}:${otp}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.indexOf('@')
  if (at <= 0) return normalized
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

/** Mask E.164 numbers for UI, e.g. +91 75***77 */
export function maskPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('91')) {
    const local = digits.slice(2)
    if (local.length === 10) {
      return `+91 ${local.slice(0, 2)}***${local.slice(-2)}`
    }
  }
  if (digits.length >= 8) {
    const visibleStart = digits.slice(0, Math.min(5, digits.length - 4))
    const visibleEnd = digits.slice(-2)
    return `+${visibleStart}***${visibleEnd}`
  }
  return phoneE164
}

function phoneToAuthyoTo(phoneE164: string): string {
  return phoneE164.replace(/\D/g, '')
}

export { phoneToAuthyoTo }

/** Build ordered Authyo origin candidates (must match Authorized endpoint in dashboard). */
export function collectAuthyoOrigins(opts: {
  siteOrigin?: string | null
  headerOrigin?: string | null
  headerReferer?: string | null
}): Array<string | null> {
  const out: string[] = []

  const add = (value?: string | null) => {
    const trimmed = value?.trim().replace(/\/$/, '') ?? ''
    if (!trimmed) return

    if (/^https?:\/\//i.test(trimmed)) {
      out.push(trimmed)
      try {
        const url = new URL(trimmed)
        out.push(url.host)
      } catch {
        // ignore invalid URL parts
      }
      return
    }

    out.push(trimmed)
    out.push(`http://${trimmed}`)
    out.push(`https://${trimmed}`)
  }

  add(Deno.env.get('AUTHYO_AUTHORIZED_ENDPOINT'))

  for (const extra of Deno.env.get('AUTHYO_EXTRA_ORIGINS')?.split(',') ?? []) {
    add(extra)
  }

  add(opts.siteOrigin)
  add(opts.headerOrigin)

  const referer = opts.headerReferer?.trim()
  if (referer) {
    try {
      add(new URL(referer).origin)
    } catch {
      // ignore
    }
  }

  add(Deno.env.get('AUTHYO_ORIGIN'))
  add(Deno.env.get('SUPABASE_URL')?.replace(/\/$/, ''))

  const seen = new Set<string>()
  const unique = out.filter((origin) => {
    if (seen.has(origin)) return false
    seen.add(origin)
    return true
  })

  // Final attempt: no origin header (some server-side integrations allow this).
  return [...unique, null]
}

/** @deprecated Use collectAuthyoOrigins — kept for compatibility */
export function resolveAuthyoOrigin(opts: {
  siteOrigin?: string | null
  headerOrigin?: string | null
  headerReferer?: string | null
}): string {
  return (collectAuthyoOrigins(opts).find((origin) => origin !== null) as string | undefined) ?? ''
}

function parseAuthyoResponse(raw: string, res: Response): AuthyoSendResponse {
  try {
    return JSON.parse(raw) as AuthyoSendResponse
  } catch {
    console.warn('[portfolio-otp] Authyo non-JSON response:', raw.slice(0, 300))
    return {}
  }
}

function authyoFailureDetail(payload: AuthyoSendResponse, raw: string, res: Response): string {
  const result = payload.data?.results?.[0]
  return (
    result?.message ??
    payload.message ??
    (raw.slice(0, 200) || `HTTP ${res.status} from Authyo`)
  )
}

function isAuthyoEndpointError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('invalid end point') || lower.includes('invalid endpoint')
}

async function authyoSendOtpRequest(opts: {
  clientId: string
  clientSecret: string
  appId?: string
  origin: string | null
  to: string
  expirySeconds: number
  otp: string
  authWay: string
  includeOtp: boolean
}): Promise<{ ok: boolean; payload: AuthyoSendResponse; raw: string; res: Response }> {
  const headers: Record<string, string> = {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }

  if (opts.appId) {
    headers.appId = opts.appId
    headers.appid = opts.appId
  }

  if (opts.origin) {
    headers.origin = opts.origin
    headers.Referer = `${opts.origin}/`
  }

  const query = new URLSearchParams({
    to: opts.to,
    expiry: String(opts.expirySeconds),
    otpLength: '6',
    authWay: opts.authWay,
  })
  if (opts.includeOtp) query.set('otp', opts.otp)

  const getUrl = `https://app.authyo.io/api/v1/auth/sendotp?${query}`
  const getRes = await fetch(getUrl, { method: 'GET', headers })
  const getRaw = await getRes.text()
  const getPayload = parseAuthyoResponse(getRaw, getRes)
  const getResult = getPayload.data?.results?.[0]
  const getOk = getRes.ok && getPayload.success !== false && getResult?.success !== false

  if (getOk) {
    return { ok: true, payload: getPayload, raw: getRaw, res: getRes }
  }

  const getError = authyoFailureDetail(getPayload, getRaw, getRes)
  if (!isAuthyoEndpointError(getError)) {
    return { ok: false, payload: getPayload, raw: getRaw, res: getRes }
  }

  const postRes = await fetch('https://app.authyo.io/api/v1/auth/sendotp', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: opts.to,
      expiry: opts.expirySeconds,
      otpLength: 6,
      otplength: 6,
      authWay: opts.authWay,
      authway: opts.authWay,
      ...(opts.includeOtp ? { otp: opts.otp } : {}),
    }),
  })
  const postRaw = await postRes.text()
  const postPayload = parseAuthyoResponse(postRaw, postRes)
  const postResult = postPayload.data?.results?.[0]
  const postOk = postRes.ok && postPayload.success !== false && postResult?.success !== false

  return {
    ok: postOk,
    payload: postPayload,
    raw: postRaw,
    res: postRes,
  }
}

interface AuthyoSendResponse {
  success?: boolean
  message?: string
  data?: {
    results?: Array<{
      success?: boolean
      message?: string
      maskId?: string
    }>
  }
}

/**
 * Send the same server-generated OTP via Authyo WhatsApp.
 * @see https://authyo.apidog.io/send-otp-12980722e0
 */
export async function sendWhatsappOtpViaAuthyo(
  phoneE164: string,
  otp: string,
  expirySeconds: number,
  originContext?: {
    siteOrigin?: string | null
    headerOrigin?: string | null
    headerReferer?: string | null
  },
): Promise<{ sent: boolean; maskId: string | null }> {
  const devMode = Deno.env.get('AUTHYO_DEV_MODE') === 'true'
  const clientId = Deno.env.get('AUTHYO_CLIENT_ID')
  const clientSecret = Deno.env.get('AUTHYO_CLIENT_SECRET')
  const appId = Deno.env.get('AUTHYO_APP_ID')?.trim()

  if (devMode) {
    console.log(`[portfolio-otp][dev] WhatsApp OTP for ${phoneE164}: ${otp}`)
    return { sent: true, maskId: null }
  }

  if (!clientId || !clientSecret) {
    console.warn('[portfolio-otp] Authyo not configured — skipping WhatsApp OTP')
    return { sent: false, maskId: null }
  }

  const to = phoneToAuthyoTo(phoneE164)
  const origins = collectAuthyoOrigins(originContext ?? {})
  const authWays = ['WhatsApp', 'Whatsapp', 'WHATSAPP'] as const
  let lastDetail = 'Authyo request failed'

  console.log(
    `[portfolio-otp] Authyo sendotp → ${to} origins=${origins.map((o) => o ?? '(none)').join(', ')}`,
  )

  for (const origin of origins) {
    for (const authWay of authWays) {
      const attempt = await authyoSendOtpRequest({
        clientId,
        clientSecret,
        appId: appId || undefined,
        origin,
        to,
        expirySeconds,
        otp,
        authWay,
        includeOtp: true,
      })

      if (attempt.ok) {
        const maskId = attempt.payload.data?.results?.[0]?.maskId ?? null
        console.log(
          `[portfolio-otp] Authyo success via origin=${origin ?? '(none)'} authWay=${authWay}`,
        )
        return { sent: true, maskId }
      }

      lastDetail = authyoFailureDetail(attempt.payload, attempt.raw, attempt.res)
      if (!isAuthyoEndpointError(lastDetail)) {
        console.warn('[portfolio-otp] Authyo error:', lastDetail, `(origin=${origin ?? 'none'})`)
        throw new Error(`Authyo: ${lastDetail}`)
      }
    }
  }

  console.warn('[portfolio-otp] Authyo error:', lastDetail, `tried=${origins.join('|')}`)
  throw new Error(`Authyo: ${lastDetail}`)
}

interface ResendError {
  message?: string
}

/**
 * Send OTP via Resend email API.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendEmailOtp(
  email: string,
  name: string,
  otp: string,
  projectName?: string | null,
): Promise<void> {
  const devMode = Deno.env.get('RESEND_DEV_MODE') === 'true'
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'NS Ventures <noreply@nsventures.in>'

  const to = normalizeEmail(email)

  if (devMode) {
    console.log(`[portfolio-otp][dev] Email OTP for ${to}: ${otp}`)
    return
  }

  if (!apiKey) {
    throw new Error(
      'Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Edge Function secrets.',
    )
  }

  const firstName = name.trim().split(/\s+/)[0] || 'there'
  const trimmedProject = projectName?.trim() ?? ''
  const projectLine = trimmedProject
    ? `<p style="margin:16px 0 0;color:#334155;font-size:14px;line-height:1.5;">You requested access to view <strong>${escapeHtml(trimmedProject)}</strong> on the NS Ventures portfolio.</p>`
    : ''
  const projectText = trimmedProject
    ? ` You requested access to view ${trimmedProject} on the NS Ventures portfolio.`
    : ''

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${otp} is your NS Ventures verification code`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <p style="margin:0 0 8px;color:#0f172a;font-size:16px;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.5;">Use this code to verify your email and continue:</p>
          <p style="margin:20px 0;font-size:32px;font-weight:700;letter-spacing:0.25em;color:#002d54;">${otp}</p>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">This code expires in 5 minutes. If you did not request this, you can ignore this email.</p>
          ${projectLine}
        </div>
      `.trim(),
      text: `Hi ${firstName}, your NS Ventures verification code is ${otp}. It expires in 5 minutes.${projectText}`,
    }),
  })

  const payload = (await res.json().catch(() => ({}))) as ResendError

  if (!res.ok) {
    const detail = payload.message ?? `HTTP ${res.status} from Resend`
    throw new Error(`Resend: ${detail}`)
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function sendResendEmail(opts: {
  to: string[]
  subject: string
  html: string
  text: string
}): Promise<void> {
  const devMode = Deno.env.get('RESEND_DEV_MODE') === 'true'
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'NS Ventures <noreply@nsventures.in>'

  if (devMode) {
    console.log(`[resend][dev] To: ${opts.to.join(', ')} | ${opts.subject}`)
    console.log(opts.text)
    return
  }

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  })

  const payload = (await res.json().catch(() => ({}))) as ResendError
  if (!res.ok) {
    const detail = payload.message ?? `HTTP ${res.status} from Resend`
    throw new Error(`Resend: ${detail}`)
  }
}

export async function sendCallbackRequestEmail(opts: {
  name: string
  email: string
  phone: string
  message?: string | null
  projectName?: string | null
}): Promise<void> {
  const notifyTo =
    Deno.env.get('CALLBACK_NOTIFY_EMAIL')?.trim() || 'prateek@nsventures.in'
  const name = opts.name.trim()
  const email = normalizeEmail(opts.email)
  const phone = opts.phone.trim()
  const message = opts.message?.trim() || '—'
  const project = opts.projectName?.trim() || '—'

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 16px;color:#002d54;font-size:20px;">New portfolio callback request</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
        <tr><td style="padding:8px 0;font-weight:600;width:120px;">Name</td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;">Email</td><td>${escapeHtml(email)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;">Phone</td><td>${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;">Project</td><td>${escapeHtml(project)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;vertical-align:top;">Message</td><td>${escapeHtml(message)}</td></tr>
      </table>
    </div>
  `.trim()

  const text = [
    'New portfolio callback request',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Project: ${project}`,
    `Message: ${message}`,
  ].join('\n')

  await sendResendEmail({
    to: [notifyTo],
    subject: `Callback request — ${name}`,
    html,
    text,
  })
}

export function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase service role is not configured')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
