import { corsHeaders, createServiceClient, errorResponse, jsonResponse } from '../_shared/portfolio-otp.ts'
import { readBearerToken, verifyAccessToken } from '../_shared/portfolio-session.ts'

interface ViewerBody {
  itemId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const token = readBearerToken(req)
    if (!token) {
      return errorResponse('Access token required', 401)
    }

    const session = await verifyAccessToken(token)
    if (!session) {
      return errorResponse('Invalid or expired session. Please verify again.', 401)
    }

    const body = (await req.json()) as ViewerBody
    const itemId = body.itemId?.trim()
    if (!itemId) {
      return errorResponse('itemId is required', 400)
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('link, media_type')
      .eq('id', itemId)
      .eq('is_published', true)
      .maybeSingle()

    if (error) throw new Error(error.message)

    const link = data?.link?.trim()
    if (!link) {
      return jsonResponse({ ok: true, viewer: null })
    }

    return jsonResponse({
      ok: true,
      viewer: {
        link,
        mediaType: data.media_type === 'video' ? 'video' : 'virtual-tour',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load viewer'
    console.error('[portfolio-viewer]', message)
    return errorResponse(message, 500)
  }
})
