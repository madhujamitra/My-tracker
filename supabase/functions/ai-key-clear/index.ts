import { corsHeaders, json } from '../_shared/cors.js'
import { requireUser, adminClient } from '../_shared/google.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await requireUser(req)
    const admin = adminClient()
    const { error } = await admin
      .from('user_ai_settings')
      .delete()
      .eq('user_id', user.id)
    if (error) throw error
    return json({ ok: true, enabled: false })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
