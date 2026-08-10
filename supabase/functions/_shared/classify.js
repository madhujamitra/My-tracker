/** Keep in sync with src/lib/gmailClassify.js */

const REJECT_RE =
  /\b(unfortunately|not moving forward|other candidates|we regret|rejected|not selected|decline to (move|proceed)|will not be (moving|progressing)|position has been filled)\b/i

const INTERVIEW_RE =
  /\b(interview|phone screen|video (call|interview)|schedule (a |an )?(call|interview|chat)|meet(ing)? with|onsite|on-site)\b/i

const CALENDAR_INVITE_RE =
  /\b(invitation:|updated invitation:|canceled event:|cancelled event:|calendar notification|you('ve| have) been invited|join (with )?google meet|zoom meeting invitation)\b/i

const APPLIED_RE =
  /\b(thank you for (applying|your application)|we (have )?received your application|application (was )?received|successfully applied|your application (for|to))\b/i

const NEEDS_REPLY_RE =
  /\b(looking forward to (your|hearing)|please (reply|respond|confirm|let us know)|awaiting your (reply|response)|when (are you|would you be) available|kindly (reply|confirm)|rsvp|can you (confirm|share)|get back to (us|me))\b/i

export function guessCompany(msg = {}) {
  const from = String(msg.from || '')
  const subject = String(msg.subject || '')

  const angle = from.match(/^([^<]+)</)
  if (angle) {
    let name = angle[1].trim().replace(/^"|"$/g, '')
    name = name.replace(
      /\s+(recruiting|careers|talent|jobs|noreply|no-reply|via greenhouse|via lever).*$/i,
      '',
    )
    if (name && !/@/.test(name) && name.length < 80) return name.trim()
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

  const subjCo = subject.match(
    /(?:at|@|from|with)\s+([A-Z][A-Za-z0-9&.\- ]{1,40})/,
  )
  if (subjCo) return subjCo[1].trim()

  return null
}

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
