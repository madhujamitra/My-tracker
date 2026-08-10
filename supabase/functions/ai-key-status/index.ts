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
      .from('user_ai_settings')
      .select('key_hint, base_url, model, enabled, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error

    return json({
      enabled: Boolean(data?.enabled && data?.key_hint),
      key_hint: data?.key_hint || null,
      base_url: data?.base_url || null,
      model: data?.model || null,
      updated_at: data?.updated_at || null,
    })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
