import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  normalizePhoneE164,
  sendCallbackRequestEmail,
} from '../_shared/portfolio-otp.ts'

interface CallbackBody {
  name?: string
  email?: string
  phone?: string
  message?: string | null
  projectName?: string | null
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
    const email = normalizeEmail(body.email ?? '')
    const phoneE164 = normalizePhoneE164(body.phone ?? '')
    const message = body.message?.trim() || null
    const projectName = body.projectName?.trim() || null

    if (!name) return errorResponse('Name is required')
    if (!email || !isValidEmail(email)) return errorResponse('A valid email is required')
    if (!phoneE164) return errorResponse('Enter a valid mobile number with country code')

    await sendCallbackRequestEmail({
      name,
      email,
      phone: phoneE164,
      message,
      projectName,
    })

    const supabase = createServiceClient()
    const { error: inquiryError } = await supabase.from('inquiries').insert({
      name,
      email,
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

    return jsonResponse({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send callback request'
    console.error('[portfolio-callback]', message)
    return errorResponse(message, 500)
  }
})
