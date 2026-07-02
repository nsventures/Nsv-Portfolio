import { createHmac, timingSafeEqual } from 'node:crypto'

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(secret, phone, otp, exp) {
  return createHmac('sha256', secret).update(`${phone}|${otp}|${exp}`).digest('hex')
}

export function createWhatsappDispatchToken({ secret, phoneE164, otp, ttlSeconds = 300 }) {
  if (!secret) throw new Error('OTP_HASH_SECRET is required for WhatsApp dispatch')
  const exp = Date.now() + ttlSeconds * 1000
  const mac = signPayload(secret, phoneE164, otp, exp)
  return base64UrlEncode(JSON.stringify({ phone: phoneE164, otp, exp, mac }))
}

export function verifyWhatsappDispatchToken(secret, token) {
  if (!secret || !token) return { ok: false, error: 'Invalid dispatch token' }

  let parsed
  try {
    parsed = JSON.parse(base64UrlDecode(token))
  } catch {
    return { ok: false, error: 'Invalid dispatch token' }
  }

  const { phone, otp, exp, mac } = parsed
  if (!phone || !otp || !exp || !mac) {
    return { ok: false, error: 'Invalid dispatch token' }
  }

  if (Date.now() > Number(exp)) {
    return { ok: false, error: 'Dispatch token expired' }
  }

  const expected = signPayload(secret, phone, otp, exp)
  const a = Buffer.from(String(mac), 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: 'Invalid dispatch token' }
  }

  return { ok: true, phoneE164: phone, otp: String(otp) }
}
