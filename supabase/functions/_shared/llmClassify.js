import { decryptApiKey } from './aiCrypto.js'
import { collapseStatusForPhaseA } from './pipelineStatus.js'

const KINDS = new Set([
  'new_opportunity',
  'new_application',
  'status_update',
  'interview_event',
  'needs_reply',
])

const STATUSES = new Set([
  'opportunity',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'not_selected',
  'withdrawn',
])

const SYSTEM = `You classify recruiting / job-application emails for a personal job tracker.

Return ONLY a valid JSON object with these keys:
{
  "kind": "new_opportunity" | "new_application" | "status_update" | "interview_event" | "needs_reply" | "ignore",
  "proposed_status": "opportunity" | "applied" | "interviewing" | "offer" | "rejected" | "not_selected" | "withdrawn" | null,
  "company": string | null,
  "job_title": string | null,
  "title": string,
  "awaiting_candidate_reply": boolean
}

GENERAL RULES
- Classify by recruiting meaning, not exact keywords. Use subject + snippet.
- Never invent company/role/offer/rejection.
- company = employer/client when clear; never recruiter person name; agency client preferred.
- Automated recruiting mail is valid.

OPPORTUNITY (cold / interest outreach — NOT applied yet)
kind = "new_opportunity", proposed_status = "opportunity"
Recruiter contacts about a concrete role but candidate has NOT been submitted.
Examples: came across your profile; opportunity at CGI; if you're interested; would you like to learn more.
Set awaiting_candidate_reply = true when they ask for a reply.

APPLIED (receipt / submission / representation)
kind = "new_application", proposed_status = "applied"
Thank you for applying; acknowledgement; receipt of resume; submitted your profile; representing you; shared with hiring team.

INTERVIEW
kind = "interview_event", proposed_status = "interviewing"
Screening/phone/technical/calendar invite. awaiting_candidate_reply if they must pick a slot.

STATUS UPDATE
kind = "status_update" with proposed_status rejected | offer | withdrawn | not_selected | interviewing
Soft rejection (still rejected): "move forward with other candidates", "whose experience more closely aligns", "wish you success in your job search". Do NOT treat positive "move forward with you/your candidacy" as rejection.

NEEDS REPLY
kind = "needs_reply" when the main purpose is candidate action. If no application started, proposed_status = "opportunity".
Do NOT use needs_reply instead of interview_event or new_application when those are primary.

IGNORE
kind = "ignore" for job alerts, newsletters, mass spam with no concrete employer/role.

COMPANY: employer not agency/person. If unsure, null.
TITLE: short label. Return ONLY JSON.`

/** Keep in sync with src/lib/llmClassifyParse.js */
export function normalizeLlmClassification(raw, msg = {}) {
  if (!raw || typeof raw !== 'object') return null
  let kind = String(raw.kind || '').trim()
  if (kind === 'ignore') return null
  if (kind === 'assessment_event' || kind === 'offer_event') {
    kind = kind === 'offer_event' ? 'status_update' : 'interview_event'
  }
  if (!KINDS.has(kind)) return null

  let proposed_status = raw.proposed_status
    ? String(raw.proposed_status).trim()
    : undefined
  if (proposed_status) {
    proposed_status = collapseStatusForPhaseA(proposed_status)
  }
  if (proposed_status && !STATUSES.has(proposed_status)) {
    proposed_status = undefined
  }

  if (kind === 'new_opportunity') proposed_status = 'opportunity'
  if (kind === 'new_application') proposed_status = 'applied'
  if (kind === 'interview_event') {
    proposed_status = proposed_status || 'interviewing'
  }
  if (kind === 'status_update' && !proposed_status) {
    proposed_status = 'rejected'
  }
  if (kind === 'needs_reply' && !proposed_status) {
    proposed_status = 'opportunity'
  }

  const company =
    typeof raw.company === 'string' && raw.company.trim()
      ? raw.company.trim().slice(0, 120)
      : null

  const role =
    typeof raw.job_title === 'string' && raw.job_title.trim()
      ? raw.job_title.trim().slice(0, 120)
      : null

  return {
    kind,
    proposed_status,
    proposed_company: company,
    proposed_role: role,
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
