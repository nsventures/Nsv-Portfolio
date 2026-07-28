import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  hashOtp,
  jsonResponse,
  normalizePhoneE164,
} from '../_shared/portfolio-otp.ts'
import { createAccessToken } from '../_shared/portfolio-session.ts'

const MAX_ATTEMPTS = 5

interface VerifyBody {
  phone?: string
  otp?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = (await req.json()) as VerifyBody
    const phoneE164 = normalizePhoneE164(body.phone ?? '')
    const otp = body.otp?.trim() ?? ''

    if (!phoneE164) return errorResponse('A valid mobile number is required')
    if (!/^\d{6}$/.test(otp)) return errorResponse('Enter the 6-digit verification code')

    const supabase = createServiceClient()

    const { data: challenge, error: fetchError } = await supabase
      .from('portfolio_otp_challenges')
      .select('id, otp_hash, name, phone_e164, project_name, attempts, expires_at, verified_at')
      .eq('phone_e164', phoneE164)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!challenge) return errorResponse('No active code for this number. Request a new one.')

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return errorResponse('Code expired. Request a new one.')
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      return errorResponse('Too many incorrect attempts. Request a new code.', 429)
    }

    const otpHash = await hashOtp(otp, phoneE164)
    const isMatch = otpHash === challenge.otp_hash

    if (!isMatch) {
      await supabase
        .from('portfolio_otp_challenges')
        .update({ attempts: challenge.attempts + 1 })
        .eq('id', challenge.id)

      return errorResponse('Incorrect code. Try again.')
    }

    const verifiedAt = new Date().toISOString()

    const { error: verifyError } = await supabase
      .from('portfolio_otp_challenges')
      .update({ verified_at: verifiedAt })
      .eq('id', challenge.id)

    if (verifyError) throw new Error(verifyError.message)

    const project = challenge.project_name?.trim()
    const { error: inquiryError } = await supabase.from('inquiries').insert({
      name: challenge.name,
      email: '',
      phone: challenge.phone_e164,
      message: project
        ? `Portfolio access (WhatsApp verified) — requested to view: ${project}`
        : 'Portfolio access (WhatsApp verified)',
      project_type: 'Portfolio viewer',
    })

    if (inquiryError) {
      console.error('[portfolio-otp-verify] inquiry insert failed:', inquiryError.message)
    }

    const session = await createAccessToken({
      name: challenge.name,
      phone: challenge.phone_e164,
    })

    return jsonResponse({
      ok: true,
      profile: {
        name: challenge.name,
        phone: challenge.phone_e164,
        verifiedAt,
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        expiresIn: session.expiresIn,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    console.error('[portfolio-otp-verify]', message)
    return errorResponse(message, 500)
  }
})
