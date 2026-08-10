import { corsHeaders, json } from '../_shared/cors.js'
import { requireUser, adminClient } from '../_shared/google.js'
import {
  encryptSecret,
  encryptionSecretFromEnv,
  keyHint,
} from '../_shared/aiCrypto.js'

const DEFAULT_BASE = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const apiKey = String(body.apiKey || body.api_key || '').trim()
    if (!apiKey || apiKey.length < 8) {
      throw new Error('API key looks too short')
    }

    const secret = encryptionSecretFromEnv()
    const ciphertext = await encryptSecret(apiKey, secret)
    const base_url = String(body.baseUrl || body.base_url || DEFAULT_BASE)
      .trim()
      .replace(/\/$/, '') || DEFAULT_BASE
    const model = String(body.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL
    const hint = keyHint(apiKey)
    const now = new Date().toISOString()

    const admin = adminClient()
    const { error } = await admin.from('user_ai_settings').upsert(
      {
        user_id: user.id,
        ciphertext,
        key_hint: hint,
        base_url,
        model,
        enabled: true,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error

    return json({
      ok: true,
      enabled: true,
      key_hint: hint,
      base_url,
      model,
    })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
