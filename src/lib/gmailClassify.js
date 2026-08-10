/** Heuristic Gmail → job-tracker classification. Keep in sync with supabase/functions/_shared/classify.js */

const REJECT_RE =
  /\b(unfortunately|not moving forward|other candidates|we regret|rejected|not selected|decline to (move|proceed)|will not be (moving|progressing)|position has been filled)\b/i

const OFFER_RE =
  /\b(offer letter|job offer|pleased to (extend|offer)|we are (pleased|happy|excited) to offer|congratulations.{0,40}offer|extend(ing)? (you )?an offer)\b/i

const INTERVIEW_RE =
  /\b(interview|phone screen|video (call|interview)|schedule (a |an )?(call|interview|chat)|meet(ing)? with|onsite|on-site|initial screening)\b/i

const CALENDAR_INVITE_RE =
  /\b(invitation:|invitation from|updated invitation:|canceled event:|cancelled event:|calendar notification|you('ve| have) been invited|join (with )?google meet|zoom meeting invitation)\b/i

const APPLIED_RE =
  /\b(thank you for (applying|your application)|we (have )?received your application|application (was )?received|successfully applied|your application (for|to))\b/i

const RECRUITER_PIPELINE_RE =
  /\b(interested in (a )?(new )?opportunity|opportunity with|represent(ing)? (you|madhuja)|would like to represent|share (it )?with the .{0,40} team|submit(ting)? (your )?resume|resume will be submitted|thank you for sending over your resume|please (share|send|review).{0,60}(resume|availability|jd|job description)|if you are interested|updated copy of (the )?resume)\b/i

const WAITING_ON_ME_RE =
  /\b(if you are interested|please (share|send|review|reply|respond|confirm)|share an updated resume|availability for|looking forward to (your|hearing)|when (are you|would you be) available|kindly (reply|confirm)|awaiting your (reply|response)|get back to (us|me)|rsvp)\b/i

const NEEDS_REPLY_RE = WAITING_ON_ME_RE

function cleanCompany(name) {
  if (!name) return null
  let s = String(name).trim().replace(/^["']|["']$/g, '')
  s = s.replace(/\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Team)\s*$/i, '').trim()
  if (s.length < 2 || s.length > 80) return null
  if (/^(hi|hello|dear|re|fw|fwd)$/i.test(s)) return null
  return s
}

/**
 * Prefer employer (client) over recruiter agency / person From-name.
 * @param {{ from?: string, subject?: string, snippet?: string }} msg
 */
export function guessCompany(msg = {}) {
  const from = String(msg.from || '')
  const subject = String(msg.subject || '')
  const snippet = String(msg.snippet || '')
  const text = `${subject} ${snippet}`

  const client = text.match(/\bClient:\s*([A-Za-z0-9&.\- ]{2,40})/i)
  if (client) {
    const c = cleanCompany(client[1])
    if (c) return c
  }

  const withTeam = text.match(
    /\bwith the\s+([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,2})\s+team\b/,
  )
  if (withTeam) {
    const c = cleanCompany(withTeam[1])
    if (c) return c
  }

  const dashTail = subject.match(/\s[-–—]\s*([A-Z][A-Za-z0-9&.\- ]{1,40})\s*$/)
  if (dashTail) {
    const c = cleanCompany(dashTail[1])
    if (c) return c
  }

  const oppWith = text.match(
    /\b(?:opportunity with|role with|position (?:with|at)|Tech Lead opportunity with)\s+([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,3})/,
  )
  if (oppWith) {
    const c = cleanCompany(oppWith[1])
    if (c) return c
  }

  const domain = from.match(/@([a-z0-9.-]+)/i)
  if (domain) {
    const host = domain[1]
      .toLowerCase()
      .replace(/^(mail|email|jobs|careers|noreply|no-reply)\./, '')
    const root = host.split('.')[0]
    if (
      root &&
      !['gmail', 'googlemail', 'yahoo', 'outlook', 'hotmail', 'icloud'].includes(
        root,
      )
    ) {
      return root.charAt(0).toUpperCase() + root.slice(1)
    }
  }

  const angle = from.match(/^([^<]+)</)
  if (angle) {
    let name = angle[1].trim().replace(/^"|"$/g, '')
    name = name.replace(
      /\s+(recruiting|careers|talent|jobs|noreply|no-reply|via greenhouse|via lever).*$/i,
      '',
    )
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(name)) {
      /* person name — skip */
    } else if (name && !/@/.test(name) && name.length < 80) {
      const c = cleanCompany(name)
      if (c) return c
    }
  }

  const subjCo = subject.match(
    /(?:at|@|from|with)\s+([A-Z][A-Za-z0-9&.\- ]{1,40})/,
  )
  if (subjCo) return cleanCompany(subjCo[1])

  return null
}

/**
 * @param {{ subject?: string, snippet?: string, from?: string }} msg
 */
export function classifyJobEmail(msg = {}) {
  const text = `${msg.subject || ''} ${msg.snippet || ''}`
  const company = guessCompany(msg)

  if (REJECT_RE.test(text)) {
    return {
      kind: 'status_update',
      proposed_status: 'rejected',
      proposed_company: company,
      proposed_title: msg.subject || 'Rejection',
    }
  }

  if (OFFER_RE.test(text)) {
    return {
      kind: 'status_update',
      proposed_status: 'offer',
      proposed_company: company,
      proposed_title: msg.subject || 'Offer',
    }
  }

  if (CALENDAR_INVITE_RE.test(text) || INTERVIEW_RE.test(text)) {
    return {
      kind: 'interview_event',
      proposed_status: 'interviewing',
      proposed_company: company,
      proposed_title: msg.subject || 'Interview',
    }
  }

  if (APPLIED_RE.test(text)) {
    return {
      kind: 'new_application',
      proposed_status: 'applied',
      proposed_company: company,
      proposed_title: msg.subject || 'Application received',
      awaiting_candidate_reply: false,
    }
  }

  if (RECRUITER_PIPELINE_RE.test(text)) {
    const awaiting = WAITING_ON_ME_RE.test(text)
    if (!company) {
      if (awaiting) {
        return {
          kind: 'needs_reply',
          proposed_company: null,
          proposed_title: msg.subject || 'Needs reply',
        }
      }
      return null
    }
    return {
      kind: 'new_application',
      proposed_status: 'applied',
      proposed_company: company,
      proposed_title: msg.subject || 'Recruiter pipeline',
      awaiting_candidate_reply: awaiting,
    }
  }

  if (NEEDS_REPLY_RE.test(text)) {
    return {
      kind: 'needs_reply',
      proposed_company: company,
      proposed_title: msg.subject || 'Needs reply',
    }
  }

  return null
}

export function matchApplication(apps, company) {
  if (!company || !Array.isArray(apps)) return null
  const c = company.toLowerCase()
  return (
    apps.find((a) => String(a.company || '').toLowerCase() === c) ||
    apps.find((a) => {
      const name = String(a.company || '').toLowerCase()
      return name.includes(c) || c.includes(name)
    }) ||
    null
  )
}
