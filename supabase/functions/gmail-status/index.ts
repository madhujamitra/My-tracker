import { corsHeaders, json } from '../_shared/cors.js'
import { requireUser, adminClient } from '../_shared/google.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await requireUser(req)
    const admin = adminClient()
    const { data, error } = await admin
      .from('gmail_connections')
      .select('email, last_synced_at, connected_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return json({
      connected: Boolean(data),
      email: data?.email || null,
      last_synced_at: data?.last_synced_at || null,
      connected_at: data?.connected_at || null,
    })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
