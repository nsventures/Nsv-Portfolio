import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  generateOtp,
  hashOtp,
  jsonResponse,
  maskPhone,
  normalizePhoneE164,
} from '../_shared/portfolio-otp.ts'
import { createWhatsappDispatchToken } from '../_shared/whatsapp-dispatch.ts'

const OTP_TTL_SECONDS = 300
const MAX_SENDS_PER_HOUR = 5
const RESEND_COOLDOWN_SECONDS = 60

interface SendBody {
  name?: string
  phone?: string
  projectName?: string | null
  siteOrigin?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = (await req.json()) as SendBody
    const name = body.name?.trim() ?? ''
    const phoneE164 = normalizePhoneE164(body.phone ?? '')
    const projectName = body.projectName?.trim() || null

    if (!name) return errorResponse('Name is required')
    if (!phoneE164) return errorResponse('Enter a valid mobile number with country code')

    const supabase = createServiceClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: phoneCount, error: phoneCountError } = await supabase
      .from('portfolio_otp_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('phone_e164', phoneE164)
      .gte('created_at', oneHourAgo)

    if (phoneCountError) throw new Error(phoneCountError.message)

    if ((phoneCount ?? 0) >= MAX_SENDS_PER_HOUR) {
      return errorResponse('Too many OTP requests. Try again later.', 429)
    }

    const { data: latest } = await supabase
      .from('portfolio_otp_challenges')
      .select('created_at')
      .eq('phone_e164', phoneE164)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest?.created_at) {
      const elapsed = Date.now() - new Date(latest.created_at).getTime()
      if (elapsed < RESEND_COOLDOWN_SECONDS * 1000) {
        const wait = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsed) / 1000)
        return errorResponse(`Please wait ${wait}s before requesting another code.`, 429)
      }
    }

    await supabase
      .from('portfolio_otp_challenges')
      .delete()
      .eq('phone_e164', phoneE164)
      .is('verified_at', null)

    const otp = generateOtp()
    const otpHash = await hashOtp(otp, phoneE164)
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString()

    const { error: insertError } = await supabase
      .from('portfolio_otp_challenges')
      .insert({
        phone_e164: phoneE164,
        otp_hash: otpHash,
        name,
        project_name: projectName,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(insertError.message)

    const whatsappDispatchToken = await createWhatsappDispatchToken({
      phoneE164,
      otp,
      ttlSeconds: OTP_TTL_SECONDS,
    })

    return jsonResponse({
      ok: true,
      expiresIn: OTP_TTL_SECONDS,
      phoneMasked: maskPhone(phoneE164),
      whatsappSent: false,
      whatsappDispatchToken,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP'
    console.error('[portfolio-otp-send]', message)
    return errorResponse(message, 500)
  }
})
