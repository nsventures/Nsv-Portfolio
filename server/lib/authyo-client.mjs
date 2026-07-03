/**
 * Authyo sendotp — strict OpenAPI (GET primary, POST fallback).
 * Retries alternate origins when Authyo returns "Invalid endpoint".
 * @see https://authyo.apidog.io/send-otp-12980154e0
 */

const AUTHYO_SEND_URL = 'https://app.authyo.io/api/v1/auth/sendotp'

function parsePayload(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function failureDetail(payload, raw, status) {
  const result = payload?.data?.results?.[0]
  return (
    result?.message ??
    payload?.message ??
    (raw.slice(0, 200) || `HTTP ${status}`)
  )
}

function isSuccess(payload, res) {
  const result = payload?.data?.results?.[0]
  return res.ok && payload?.success !== false && result?.success !== false
}

function isEndpointError(message) {
  const lower = String(message).toLowerCase()
  return lower.includes('invalid end point') || lower.includes('invalid endpoint')
}

function authHeaders({ clientId, clientSecret, appId, origin }) {
  const headers = { clientId, clientSecret }
  if (appId?.trim()) {
    headers.appId = appId.trim()
    headers.appid = appId.trim()
  }
  if (origin?.trim()) {
    const normalized = origin.trim().replace(/\/$/, '')
    headers.origin = normalized
    headers.Referer = `${normalized}/`
  }
  return headers
}

async function attemptSend({ clientId, clientSecret, appId, to, otp, expirySeconds, authWay, origin }) {
  const headers = authHeaders({ clientId, clientSecret, appId, origin })

  const query = new URLSearchParams({
    to,
    expiry: String(expirySeconds),
    otpLength: '6',
    authWay,
    otp,
  })

  const getRes = await fetch(`${AUTHYO_SEND_URL}?${query}`, { method: 'GET', headers })
  const getRaw = await getRes.text()
  const getPayload = parsePayload(getRaw)

  if (isSuccess(getPayload, getRes)) {
    return {
      ok: true,
      maskId: getPayload.data?.results?.[0]?.maskId ?? null,
      method: 'GET',
      origin: origin ?? '(none)',
    }
  }

  const getError = failureDetail(getPayload, getRaw, getRes.status)
  if (!isEndpointError(getError)) {
    const postRes = await fetch(AUTHYO_SEND_URL, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        expiry: expirySeconds,
        otplength: 6,
        authway: authWay,
        otp,
      }),
    })
    const postRaw = await postRes.text()
    const postPayload = parsePayload(postRaw)

    if (isSuccess(postPayload, postRes)) {
      return {
        ok: true,
        maskId: postPayload.data?.results?.[0]?.maskId ?? null,
        method: 'POST',
        origin: origin ?? '(none)',
      }
    }

    return {
      ok: false,
      error: failureDetail(postPayload, postRaw, postRes.status) || getError,
      method: 'POST',
      origin: origin ?? '(none)',
      endpointError: false,
    }
  }

  return {
    ok: false,
    error: getError,
    method: 'GET',
    origin: origin ?? '(none)',
    endpointError: true,
  }
}

function collectOrigins(preferred) {
  const out = []
  const add = (value) => {
    const trimmed = value?.trim().replace(/\/$/, '') ?? ''
    if (!trimmed || out.includes(trimmed)) return
    out.push(trimmed)
  }

  add(preferred)
  add(process.env.AUTHYO_AUTHORIZED_ENDPOINT)
  add(process.env.AUTHYO_ORIGIN)
  add('http://localhost:5173')
  add('http://127.0.0.1:5173')

  for (const extra of process.env.AUTHYO_EXTRA_ORIGINS?.split(',') ?? []) {
    add(extra)
  }

  return out
}

/**
 * @param {object} opts
 * @param {string} opts.clientId
 * @param {string} opts.clientSecret
 * @param {string} opts.to digits with country code e.g. 919876543210
 * @param {string} opts.otp
 * @param {number} [opts.expirySeconds]
 * @param {string} [opts.authWay]
 * @param {string} [opts.origin]
 * @param {string} [opts.appId]
 */
export async function sendAuthyoWhatsappOtp(opts) {
  const {
    clientId,
    clientSecret,
    to,
    otp,
    expirySeconds = 300,
    authWay = 'WhatsApp',
    origin,
    appId = process.env.AUTHYO_APP_ID ?? '',
  } = opts

  const origins = collectOrigins(origin)
  const authWays = ['WhatsApp', 'WHATSAPP']

  let lastError = 'Authyo request failed'
  let lastOrigin = origin ?? '(none)'

  for (const tryOrigin of origins.length ? origins : [null]) {
    for (const tryAuthWay of authWays) {
      const result = await attemptSend({
        clientId,
        clientSecret,
        appId,
        to,
        otp,
        expirySeconds,
        authWay: tryAuthWay,
        origin: tryOrigin,
      })

      if (result.ok) return result

      lastError = result.error
      lastOrigin = result.origin

      if (!result.endpointError) {
        return { ok: false, error: lastError, method: result.method, origin: lastOrigin }
      }
    }
  }

  const endpointRejected = String(lastError).toLowerCase().includes('invalid end point')

  return {
    ok: false,
    error: endpointRejected
      ? 'Authyo rejected this app (invalid endpoint). Copy Client ID and Client Secret from the same Authyo application that has your site URL saved under Authorized endpoints, update .env.local / Vercel, then click Save in Authyo.'
      : `${lastError} (tried origins: ${origins.join(', ') || 'none'})`,
    method: 'GET',
    origin: lastOrigin,
    endpointRejected,
  }
}
