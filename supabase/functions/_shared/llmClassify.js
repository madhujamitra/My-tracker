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

const SYSTEM = `You classify recruiting / job-application emails for a personal job tracker.

Return ONLY a valid JSON object with these keys:
{
  "kind": "new_application" | "status_update" | "interview_event" | "needs_reply" | "ignore",
  "proposed_status": "applied" | "interviewing" | "offer" | "rejected" | "not_selected" | "withdrawn" | null,
  "company": string | null,
  "title": string,
  "awaiting_candidate_reply": boolean
}

GENERAL RULES
- Classify based on the actual recruiting meaning of the email, not only exact keywords.
- Use both subject and body (snippet).
- Never invent a company, job title, interview, rejection, or offer.
- "company" must be the employer/client company whenever clearly identifiable.
- Do NOT use the recruiter person's name as the company.
- If an agency is recruiting for a clearly named client/employer, return the client/employer.
- If only the recruiting agency is known and no employer/client can be determined safely, company may be null.
- Prefer ignore when the email is unrelated to an actual job opportunity or candidate pipeline.
- Automated recruiting emails are valid and should NOT be ignored merely because they are automated.

TYPE A — APPLICATION RECEIPT / ACKNOWLEDGEMENT
kind = "new_application", proposed_status = "applied"
Includes any confirmation that an application, resume, CV, or candidacy was received or submitted.
Examples: thank you for applying; application received; application acknowledgement/acknowledgment; job application acknowledgement; receipt of your application/resume; resume received; CV received; your application is under review; we will review your application; our recruiting team has received your information; thanks for your interest in [company/role]; confirmation of application.
Do NOT require the exact phrase "thank you for applying".
If the message clearly confirms the candidate entered the hiring process, treat as new_application even if wording is unusual.

TYPE B — RECRUITER PIPELINE / REPRESENTATION
kind = "new_application", proposed_status = "applied"
When the candidate is actively entering a recruiter-driven hiring pipeline: represent the candidate; resume submitted/shared with client; presented to employer; profile forwarded; "I submitted your profile"; "resume has been sent to the client/team".
Do NOT treat generic unsolicited recruiter outreach as an application unless there is clear evidence of an active role/pipeline.

TYPE C — INTERVIEW / SCREENING EVENT
kind = "interview_event", proposed_status = "interviewing"
Interview invitation, phone screen, technical/HM/panel/coding interview, onsite/virtual, assessment discussion, scheduling request, calendar invite related to hiring, reschedule, choose availability.
If it both schedules an interview and asks for a reply, prefer interview_event and set awaiting_candidate_reply = true.

TYPE D — STATUS UPDATE
kind = "status_update"
proposed_status = "interviewing": moved to next stage / next round / process continuing.
proposed_status = "offer": explicit job offer / offer letter / verbal offer / package / conditional offer. Do NOT classify vague positive feedback as an offer.
proposed_status = "rejected": explicit rejection / unsuccessful / not moving forward / decided not to proceed.
proposed_status = "not_selected": softer selection outcome / another candidate selected / position closed without strong rejection language.
proposed_status = "withdrawn": candidate withdrew / application removed at candidate request.

TYPE E — NEEDS REPLY
kind = "needs_reply", awaiting_candidate_reply = true
Main purpose is waiting for candidate action: send resume, confirm interest, reply if interested, availability, screening questions, salary/location/work auth, documents, required recruiting step.
Priority: interview invitation/scheduling → interview_event (not needs_reply). Application/status confirmation with only optional contact language → do not use needs_reply.

COLD OUTREACH / SPAM
kind = "ignore", proposed_status = null
Ignore: generic staffing spam, bulk marketing, vague opportunity with no employer/role, newsletters, job-board alerts, automated recommendations, LinkedIn suggested jobs, recruiting sales pitches, career coaching ads, unrelated mail.
Do NOT ignore legitimate recruiter outreach merely because the employer is initially undisclosed if there is a concrete role and meaningful candidate interaction (company may be null).

COMPANY EXTRACTION
1. Prefer the actual employer hiring for the role.
2. If a staffing agency names a client, use the client.
3. Do not use recruiter names.
4. Do not infer a company solely from an email domain if the body contradicts it.
5. You may use a clearly identifiable company from sender/domain/signature when it is obviously the employer.
6. If uncertain, return null rather than inventing one.

TITLE
Concise tracker label, e.g. "Application received", "Application acknowledgement", "Resume submitted to client", "Recruiter screening invitation", "Technical interview scheduled", "Application rejected", "Offer received", "Recruiter awaiting reply". Do not copy an excessively long subject verbatim.

AWAITING CANDIDATE REPLY
true only when the candidate must act or reply. false for receipts, informational status, rejections, completed interview confirmations with no action, offers unless a response/acceptance is requested.

DECISION PRIORITY
1. Explicit rejection / offer / withdrawal → status_update
2. Interview invitation or scheduling → interview_event
3. Application receipt / recruiter submission → new_application
4. Candidate action required → needs_reply
5. Otherwise → ignore

Return ONLY the JSON object. No markdown, explanation, commentary, or code fences.`

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
