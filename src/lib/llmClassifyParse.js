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

/**
 * Normalize LLM JSON into the same shape as classifyJobEmail, or null.
 * @param {unknown} raw
 * @param {{ subject?: string, from?: string }} msg
 */
export function normalizeLlmClassification(raw, msg = {}) {
  if (!raw || typeof raw !== 'object') return null
  const obj = /** @type {Record<string, unknown>} */ (raw)
  const kind = String(obj.kind || '').trim()
  if (kind === 'ignore' || !KINDS.has(kind)) return null

  let proposed_status = obj.proposed_status
    ? String(obj.proposed_status).trim()
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
    typeof obj.company === 'string' && obj.company.trim()
      ? obj.company.trim().slice(0, 120)
      : null

  return {
    kind,
    proposed_status,
    proposed_company: company,
    proposed_title:
      (typeof obj.title === 'string' && obj.title.trim()) ||
      msg.subject ||
      kind,
    source: 'llm',
    awaiting_candidate_reply: Boolean(obj.awaiting_candidate_reply),
  }
}

/**
 * Parse model content (JSON string or object).
 */
export function parseLlmClassificationContent(content, msg = {}) {
  if (content == null) return null
  try {
    const raw = typeof content === 'string' ? JSON.parse(content) : content
    return normalizeLlmClassification(raw, msg)
  } catch {
    return null
  }
}
