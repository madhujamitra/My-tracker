import { decryptApiKey } from './aiCrypto.js'

const KINDS = new Set([
  'new_application',
  'status_update',
  'interview_event',
  'needs_reply',
])

const STATUSES = new Set([
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'not_selected',
  'withdrawn',
])

const SYSTEM = `You classify recruiting / job-application emails for a personal tracker.
Return ONLY a JSON object with keys:
- kind: one of new_application | status_update | interview_event | needs_reply | ignore
- proposed_status: for status_update one of applied | interviewing | offer | rejected | not_selected | withdrawn
- company: EMPLOYER / client company name (not the recruiting agency or person), or null
- title: short label
- awaiting_candidate_reply: true when the recruiter is waiting on the candidate to reply (resume/availability)
Rules:
- Type A: application receipt / thank-you-for-applying → new_application, applied
- Type B: recruiter pipeline (opportunity, represent you, resume shared with client team) → new_application, applied (same status)
- Calendar / screening invites → interview_event
- Pure cold spam with no employer → ignore
- Never invent employers. Prefer ignore when unsure.`

/** Keep in sync with src/lib/llmClassifyParse.js */
export function normalizeLlmClassification(raw, msg = {}) {
  if (!raw || typeof raw !== 'object') return null
  const kind = String(raw.kind || '').trim()
  if (kind === 'ignore' || !KINDS.has(kind)) return null

  let proposed_status = raw.proposed_status
    ? String(raw.proposed_status).trim()
    : undefined
  if (proposed_status && !STATUSES.has(proposed_status)) {
    proposed_status = undefined
  }

  if (kind === 'status_update' && !proposed_status) {
    proposed_status = 'rejected'
  }
  if (kind === 'new_application') proposed_status = 'applied'
  if (kind === 'interview_event') proposed_status = 'interviewing'

  const company =
    typeof raw.company === 'string' && raw.company.trim()
      ? raw.company.trim().slice(0, 120)
      : null

  return {
    kind,
    proposed_status,
    proposed_company: company,
    proposed_title:
      (typeof raw.title === 'string' && raw.title.trim()) ||
      msg.subject ||
      kind,
    source: 'llm',
    awaiting_candidate_reply: Boolean(raw.awaiting_candidate_reply),
  }
}

export function parseLlmClassificationContent(content, msg = {}) {
  if (content == null) return null
  try {
    const raw = typeof content === 'string' ? JSON.parse(content) : content
    return normalizeLlmClassification(raw, msg)
  } catch {
    return null
  }
}

/**
 * Load decrypted AI settings for a user, or null if disabled / missing.
 */
export async function loadUserAiClient(admin, userId) {
  const { data, error } = await admin
    .from('user_ai_settings')
    .select('ciphertext, base_url, model, enabled')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data?.ciphertext || data.enabled === false) return null

  let apiKey
  try {
    apiKey = await decryptApiKey(data.ciphertext)
  } catch (err) {
    console.error('AI key decrypt failed', err)
    return null
  }
  if (!apiKey) return null

  return {
    apiKey,
    baseUrl: (data.base_url || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: data.model || 'gpt-4o-mini',
  }
}

/** Only subject/snippet/from — keep in sync with src/lib/aiPrivacy.js */
export function buildLlmMailPayload(msg = {}) {
  return {
    subject: String(msg.subject ?? ''),
    snippet: String(msg.snippet ?? ''),
    from: String(msg.from ?? ''),
  }
}

/**
 * Call chat completions; return classification or null.
 * Sends mail metadata to the *user's* base_url only (BYOK), never a hosted app LLM.
 */
export async function classifyWithLlm(msg, client) {
  const url = `${client.baseUrl}/chat/completions`
  const mailPayload = buildLlmMailPayload(msg)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: client.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: JSON.stringify(mailPayload),
        },
      ],
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(
      body?.error?.message || `LLM HTTP ${res.status}`,
    )
    err.status = res.status
    throw err
  }

  const content = body?.choices?.[0]?.message?.content
  return parseLlmClassificationContent(content, msg)
}
