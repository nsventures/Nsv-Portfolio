import { sendAuthyoWhatsappOtp } from '../../server/lib/authyo-client.mjs'
import { verifyWhatsappDispatchToken } from '../../server/lib/whatsapp-dispatch.mjs'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const secret = process.env.OTP_HASH_SECRET ?? ''
  const clientId = process.env.AUTHYO_CLIENT_ID ?? ''
  const clientSecret = process.env.AUTHYO_CLIENT_SECRET ?? ''
  const appId = process.env.AUTHYO_APP_ID ?? ''

  if (!secret || !clientId || !clientSecret) {
    res.status(503).json({
      ok: false,
      error:
        'WhatsApp relay not configured — set OTP_HASH_SECRET, AUTHYO_CLIENT_ID, AUTHYO_CLIENT_SECRET on Vercel (same OTP_HASH_SECRET as Supabase).',
    })
    return
  }

  const body = req.body ?? {}
  const verified = verifyWhatsappDispatchToken(secret, body.token)
  if (!verified.ok) {
    res.status(400).json({ ok: false, error: verified.error })
    return
  }

  const origin =
    body.origin?.trim().replace(/\/$/, '') ||
    process.env.AUTHYO_AUTHORIZED_ENDPOINT?.trim().replace(/\/$/, '') ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
      : '')

  const to = verified.phoneE164.replace(/\D/g, '')

  const result = await sendAuthyoWhatsappOtp({
    clientId,
    clientSecret,
    appId,
    to,
    otp: verified.otp,
    origin,
    authWay: 'WhatsApp',
  })

  if (result.ok) {
    res.status(200).json({ ok: true, maskId: result.maskId, method: result.method })
    return
  }

  console.warn('[authyo-relay]', result.error, `origin=${origin}`)
  res.status(502).json({ ok: false, error: result.error })
}
