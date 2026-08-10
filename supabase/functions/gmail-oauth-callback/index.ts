import { corsHeaders, redirect } from '../_shared/cors.js'
import {
  adminClient,
  parseOAuthState,
  googleClientConfig,
  exchangeCodeForTokens,
  getGmailProfile,
} from '../_shared/google.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { appUrl } = googleClientConfig()
  const url = new URL(req.url)
  const errParam = url.searchParams.get('error')
  if (errParam) {
    return redirect(`${appUrl}/?gmail=error&reason=${encodeURIComponent(errParam)}`)
  }

  try {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state) throw new Error('Missing code or state')

    const userId = await parseOAuthState(state)
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token && !tokens.access_token) {
      throw new Error('No tokens returned — revoke prior access and reconnect')
    }

    const profile = await getGmailProfile(tokens.access_token)
    const admin = adminClient()
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    // Preserve existing refresh_token if Google omitted it on re-consent
    const { data: existing } = await admin
      .from('gmail_connections')
      .select('refresh_token')
      .eq('user_id', userId)
      .maybeSingle()

    const refresh = tokens.refresh_token || existing?.refresh_token
    if (!refresh) throw new Error('No refresh token — remove app access in Google Account and retry')

    const { error } = await admin.from('gmail_connections').upsert(
      {
        user_id: userId,
        email: profile.emailAddress || null,
        refresh_token: refresh,
        access_token: tokens.access_token,
        access_token_expires_at: expiresAt,
        last_history_id: profile.historyId ? String(profile.historyId) : null,
        updated_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error

    return redirect(`${appUrl}/?gmail=connected`)
  } catch (err) {
    return redirect(
      `${appUrl}/?gmail=error&reason=${encodeURIComponent(err.message || String(err))}`,
    )
  }
})
