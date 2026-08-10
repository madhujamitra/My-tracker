/**
 * Privacy / blast-radius helpers for BYOK AI.
 * Keep Edge `_shared/llmClassify.js` payload keys in sync with buildLlmMailPayload.
 */

const FORBIDDEN_RESPONSE_KEYS = new Set([
  'apikey',
  'api_key',
  'ciphertext',
  'authorization',
  'refresh_token',
  'access_token',
  'password',
  'secret',
])

/**
 * Only these Gmail fields may be sent to the user's LLM.
 * Never include body, raw MIME, attachments, or OAuth tokens.
 */
export function buildLlmMailPayload(msg = {}) {
  return {
    subject: String(msg.subject ?? ''),
    snippet: String(msg.snippet ?? ''),
    from: String(msg.from ?? ''),
  }
}

/** Public ai-key-status / save response shape (no secrets). */
export function aiStatusPublicFields(row) {
  return {
    enabled: Boolean(row?.enabled && row?.key_hint),
    key_hint: row?.key_hint || null,
    base_url: row?.base_url || null,
    model: row?.model || null,
    updated_at: row?.updated_at || null,
  }
}

/**
 * Sync summary fields returned to the browser — counts only.
 * Reject if any forbidden secret-ish key appears (case-insensitive).
 */
export function assertClientSafeObject(obj, label = 'response') {
  if (obj == null || typeof obj !== 'object') {
    throw new Error(`${label} must be an object`)
  }
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_RESPONSE_KEYS.has(key.toLowerCase())) {
      throw new Error(`${label} must not include ${key}`)
    }
    const v = obj[key]
    if (typeof v === 'string' && /^(sk-|sk-proj-)/i.test(v.trim())) {
      throw new Error(`${label}.${key} looks like an API key`)
    }
  }
  return true
}

/** Hint must never equal or contain the full key (last-4 suffix is OK). */
export function hintIsSafe(apiKey, hint) {
  const key = String(apiKey || '')
  const h = String(hint || '')
  if (!key || !h) return false
  if (h === key) return false
  if (h.includes(key)) return false
  return true
}
