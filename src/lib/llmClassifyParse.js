import { collapseStatusForPhaseA } from './pipelineStatus.js'

const KINDS = new Set([
  'new_opportunity',
  'new_application',
  'status_update',
  'interview_event',
  'needs_reply',
])

/** Phase A DB allowlist after collapse */
const STATUSES = new Set([
  'opportunity',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'not_selected',
  'withdrawn',
])

/**
 * Normalize LLM JSON into the same shape as classifyJobEmail, or null.
 */
export function normalizeLlmClassification(raw, msg = {}) {
  if (!raw || typeof raw !== 'object') return null
  const obj = /** @type {Record<string, unknown>} */ (raw)
  let kind = String(obj.kind || '').trim()
  if (kind === 'ignore') return null
  if (kind === 'assessment_event' || kind === 'offer_event') {
    kind = kind === 'offer_event' ? 'status_update' : 'interview_event'
  }
  if (!KINDS.has(kind)) return null

  let proposed_status = obj.proposed_status
    ? String(obj.proposed_status).trim()
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
    typeof obj.company === 'string' && obj.company.trim()
      ? obj.company.trim().slice(0, 120)
      : null

  const role =
    typeof obj.job_title === 'string' && obj.job_title.trim()
      ? obj.job_title.trim().slice(0, 120)
      : null

  return {
    kind,
    proposed_status,
    proposed_company: company,
    proposed_role: role,
    proposed_title:
      (typeof obj.title === 'string' && obj.title.trim()) ||
      msg.subject ||
      kind,
    source: 'llm',
    awaiting_candidate_reply: Boolean(obj.awaiting_candidate_reply),
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
