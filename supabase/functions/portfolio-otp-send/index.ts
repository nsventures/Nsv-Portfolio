import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  generateOtp,
  hashOtp,
  isValidEmail,
  jsonResponse,
  maskEmail,
  maskPhone,
  normalizeEmail,
  normalizePhoneE164,
  sendEmailOtp,
} from '../_shared/portfolio-otp.ts'
import { createWhatsappDispatchToken } from '../_shared/whatsapp-dispatch.ts'

const OTP_TTL_SECONDS = 300
const MAX_SENDS_PER_HOUR = 5
const RESEND_COOLDOWN_SECONDS = 60

interface SendBody {
  name?: string
  email?: string
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
    const email = normalizeEmail(body.email ?? '')
    const phoneE164 = normalizePhoneE164(body.phone ?? '')
    const projectName = body.projectName?.trim() || null

    if (!name) return errorResponse('Name is required')
    if (!email || !isValidEmail(email)) return errorResponse('A valid email is required')
    if (!phoneE164) return errorResponse('Enter a valid mobile number with country code')

    const supabase = createServiceClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const [{ count, error: countError }, { count: phoneCount, error: phoneCountError }] =
      await Promise.all([
        supabase
          .from('portfolio_otp_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('email', email)
          .gte('created_at', oneHourAgo),
        supabase
          .from('portfolio_otp_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('phone_e164', phoneE164)
          .gte('created_at', oneHourAgo),
      ])

    if (countError) throw new Error(countError.message)
    if (phoneCountError) throw new Error(phoneCountError.message)

    if ((count ?? 0) >= MAX_SENDS_PER_HOUR || (phoneCount ?? 0) >= MAX_SENDS_PER_HOUR) {
      return errorResponse('Too many OTP requests. Try again later.', 429)
    }

    const { data: latest } = await supabase
      .from('portfolio_otp_challenges')
      .select('created_at')
      .eq('email', email)
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
      .eq('email', email)
      .is('verified_at', null)

    const otp = generateOtp()
    const otpHash = await hashOtp(otp, email)
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString()

    const { data: challenge, error: insertError } = await supabase
      .from('portfolio_otp_challenges')
      .insert({
        phone_e164: phoneE164,
        otp_hash: otpHash,
        name,
        email,
        project_name: projectName,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(insertError.message)

    const sentAt = new Date().toISOString()

    try {
      await sendEmailOtp(email, name, otp, projectName)
    } catch (err) {
      await supabase.from('portfolio_otp_challenges').delete().eq('id', challenge.id)
      throw err
    }

    const whatsappDispatchToken = await createWhatsappDispatchToken({
      phoneE164,
      otp,
      ttlSeconds: OTP_TTL_SECONDS,
    })

    await supabase
      .from('portfolio_otp_challenges')
      .update({
        email_sent_at: sentAt,
      })
      .eq('id', challenge.id)

    return jsonResponse({
      ok: true,
      expiresIn: OTP_TTL_SECONDS,
      emailMasked: maskEmail(email),
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
