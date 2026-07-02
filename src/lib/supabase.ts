import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }

  return client
}

export function getTourThumbPublicUrl(path: string): string {
  const normalized = path.replace(/^\/+/, '').replace(/^tour-thumbs\//, '')
  return `${supabaseUrl}/storage/v1/object/public/tour-thumbs/${normalized}`
}
