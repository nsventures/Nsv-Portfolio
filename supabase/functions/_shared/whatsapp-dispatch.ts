/** Short-lived signed token so the browser can trigger WhatsApp via a relay (not Supabase → Authyo). */

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createWhatsappDispatchToken(opts: {
  phoneE164: string
  otp: string
  ttlSeconds?: number
}): Promise<string> {
  const secret = Deno.env.get('OTP_HASH_SECRET')
  if (!secret) throw new Error('OTP_HASH_SECRET is not configured')

  const exp = Date.now() + (opts.ttlSeconds ?? 300) * 1000
  const mac = await hmacSha256Hex(secret, `${opts.phoneE164}|${opts.otp}|${exp}`)
  return base64UrlEncode(JSON.stringify({ phone: opts.phoneE164, otp: opts.otp, exp, mac }))
}
