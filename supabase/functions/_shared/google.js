import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

export function userClient(authHeader) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  })
}

export async function requireUser(req) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing Authorization')
  const supabase = userClient(authHeader)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { user, authHeader, supabase }
}

function b64url(bytes) {
  let s = btoa(String.fromCharCode(...bytes))
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacSign(message, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return b64url(new Uint8Array(sig))
}

export async function makeOAuthState(userId) {
  const secret = Deno.env.get('GMAIL_OAUTH_STATE_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const payload = btoa(JSON.stringify({ u: userId, e: Date.now() + 10 * 60 * 1000 }))
  const sig = await hmacSign(payload, secret)
  return `${payload}.${sig}`
}

export async function parseOAuthState(state) {
  const secret = Deno.env.get('GMAIL_OAUTH_STATE_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const [payload, sig] = String(state || '').split('.')
  if (!payload || !sig) throw new Error('Invalid state')
  const expected = await hmacSign(payload, secret)
  if (expected !== sig) throw new Error('Invalid state signature')
  const data = JSON.parse(atob(payload))
  if (!data.u || !data.e || Date.now() > data.e) throw new Error('State expired')
  return data.u
}

export function googleClientConfig() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const appUrl = (Deno.env.get('APP_URL') || 'http://localhost:5173').replace(/\/$/, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set on Edge Functions')
  }
  const redirectUri = `${supabaseUrl}/functions/v1/gmail-oauth-callback`
  return { clientId, clientSecret, appUrl, redirectUri }
}

export async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = googleClientConfig()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error_description || json.error || 'Token exchange failed')
  }
  return json
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = googleClientConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error_description || json.error || 'Token refresh failed')
  }
  return json
}

export async function getGmailProfile(accessToken) {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'Failed to load Gmail profile')
  return json
}
