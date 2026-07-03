import { normalizeEmail } from './portfolio-otp.ts'

/** 24 hours — matches client-side device memory. */
export const ACCESS_TTL_SECONDS = 24 * 60 * 60

export interface AccessTokenClaims {
  email: string
  name: string
  phone: string
  iat: number
  exp: number
}

function tokenSecret(): string {
  const secret =
    Deno.env.get('ACCESS_TOKEN_SECRET') ?? Deno.env.get('OTP_HASH_SECRET') ?? ''
  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET or OTP_HASH_SECRET is not configured')
  }
  return secret
}

function encodeBase64Url(bytes: Uint8Array): string {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeJsonBase64Url(value: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4)
  const bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createAccessToken(profile: {
  email: string
  name: string
  phone: string
}): Promise<{ accessToken: string; expiresAt: string; expiresIn: number }> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + ACCESS_TTL_SECONDS
  const header = encodeJsonBase64Url({ alg: 'HS256', typ: 'JWT' })
  const payload = encodeJsonBase64Url({
    email: normalizeEmail(profile.email),
    name: profile.name.trim(),
    phone: profile.phone.trim(),
    iat: now,
    exp,
  })
  const signingInput = `${header}.${payload}`
  const key = await hmacKey(tokenSecret())
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  )
  const accessToken = `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`

  return {
    accessToken,
    expiresAt: new Date(exp * 1000).toISOString(),
    expiresIn: ACCESS_TTL_SECONDS,
  }
}

export async function verifyAccessToken(
  token: string,
): Promise<Pick<AccessTokenClaims, 'email' | 'name' | 'phone'> | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const signingInput = `${headerB64}.${payloadB64}`
    const key = await hmacKey(tokenSecret())
    const signature = decodeBase64Url(signatureB64)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(signingInput),
    )
    if (!valid) return null

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payloadB64)),
    ) as AccessTokenClaims

    if (!payload.email || !payload.name || !payload.phone) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      return null
    }

    return {
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
    }
  } catch {
    return null
  }
}

export function readBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization')?.trim()
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return token || null
}
