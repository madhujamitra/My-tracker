import { corsHeaders, json } from '../_shared/cors.js'
import { requireUser, makeOAuthState, googleClientConfig } from '../_shared/google.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await requireUser(req)
    const { clientId, redirectUri } = googleClientConfig()
    const state = await makeOAuthState(user.id)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope:
        'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    })
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    return json({ url })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
