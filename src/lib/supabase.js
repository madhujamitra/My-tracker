import { createClient } from '@supabase/supabase-js'

function normalizeUrl(url) {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

const url = normalizeUrl(import.meta.env.VITE_SUPABASE_URL)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured() {
  return Boolean(url && anonKey)
}

if (!isSupabaseConfigured()) {
  console.warn(
    '[my-task] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will not work.',
  )
}

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
