import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
  normalizePhoneE164,
  sendCallbackRequestEmail,
} from '../_shared/portfolio-otp.ts'
import { verifyRecaptchaV3 } from '../_shared/recaptcha.ts'

interface CallbackBody {
  name?: string
  phone?: string
  message?: string | null
  projectName?: string | null
  captchaToken?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = (await req.json()) as CallbackBody
    const name = body.name?.trim() ?? ''
    const phoneE164 = normalizePhoneE164(body.phone ?? '')
    const message = body.message?.trim() || null
    const projectName = body.projectName?.trim() || null

    if (!name) return errorResponse('Name is required')
    if (!phoneE164) return errorResponse('Enter a valid mobile number with country code')

    const captcha = await verifyRecaptchaV3(body.captchaToken, 'portfolio_callback', req)
    if (!captcha.ok) return errorResponse(captcha.error, 400)

    const supabase = createServiceClient()
    const { error: inquiryError } = await supabase.from('inquiries').insert({
      name,
      email: '',
      phone: phoneE164,
      message: message
        ? `Callback request — ${message}`
        : projectName
          ? `Callback request — interested in: ${projectName}`
          : 'Callback request from portfolio access gate',
      project_type: 'Callback request',
    })

    if (inquiryError) {
      console.error('[portfolio-callback] inquiry insert failed:', inquiryError.message)
    }

    try {
      await sendCallbackRequestEmail({ name, phone: phoneE164, message, projectName })
    } catch (emailErr) {
      const emailMessage =
        emailErr instanceof Error ? emailErr.message : 'Failed to send notification email'
      console.error('[portfolio-callback] notification email failed:', emailMessage)
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send callback request'
    console.error('[portfolio-callback]', message)
    return errorResponse(message, 500)
  }
})
