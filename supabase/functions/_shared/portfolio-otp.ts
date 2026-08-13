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

export async function hashOtp(otp: string, identifier: string): Promise<string> {
  const secret = Deno.env.get('OTP_HASH_SECRET')
  if (!secret) throw new Error('OTP_HASH_SECRET is not configured')

  const normalized = identifier.trim()
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

interface MetaWhatsappSendResponse {
  messages?: Array<{ id?: string }>
  error?: { message?: string; code?: number; error_subcode?: number; type?: string }
}

/**
 * Send the same server-generated OTP via Meta WhatsApp Cloud API using an
 * approved Authentication template.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
export async function sendWhatsappOtpViaMeta(
  phoneE164: string,
  otp: string,
): Promise<{ sent: boolean; messageId: string | null }> {
  const devMode = Deno.env.get('WHATSAPP_DEV_MODE') === 'true'
  const token = Deno.env.get('WHATSAPP_TOKEN')?.trim()
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')?.trim()
  const templateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME')?.trim()
  const templateLang = Deno.env.get('WHATSAPP_TEMPLATE_LANG')?.trim() || 'en'

  if (devMode) {
    console.log(`[portfolio-otp][dev] WhatsApp OTP for ${phoneE164}: ${otp}`)
    return { sent: true, messageId: null }
  }

  if (!token || !phoneNumberId || !templateName) {
    console.warn('[portfolio-otp] Meta WhatsApp not configured — skipping WhatsApp OTP')
    return { sent: false, messageId: null }
  }

  const to = phoneE164.replace(/\D/g, '')

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
          // If the approved template also has a "Copy code" quick-reply button,
          // Meta requires a matching button component, e.g.:
          // { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
      },
    }),
  })

  const payload = (await res.json().catch(() => ({}))) as MetaWhatsappSendResponse

  if (!res.ok || payload.error) {
    const detail = payload.error?.message ?? `HTTP ${res.status} from Meta`
    console.warn('[portfolio-otp] Meta WhatsApp error:', detail)
    throw new Error(`WhatsApp: ${detail}`)
  }

  const messageId = payload.messages?.[0]?.id ?? null
  console.log(`[portfolio-otp] Meta WhatsApp sent → ${to} (${messageId ?? 'no id'})`)
  return { sent: true, messageId }
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
  const email = opts.email.trim()
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
