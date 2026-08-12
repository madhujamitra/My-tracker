/** Keep in sync with src/lib/gmailClassify.js */

const IGNORE_RE =
  /\b(\d+\s+new .{0,60}jobs for you|jobs you may be interested in|see all recommended jobs|linkedin jobs)\b/i

/** Soft rejects often say "move forward with *other* candidates" — not bare "move forward" (that can be positive). */
const REJECT_RE =
  /\b(unfortunately|not moving forward|not to move forward|move(?:ing)? forward with other (candidates|applicants)|other candidates|whose experience more closely aligns|more closely align(?:s|ed) with|selected (another|other) candidate|going with (another|other) (candidate|applicant)|we regret|rejected|not selected|decline to (move|proceed)|will not be (moving|progressing)|position has been filled|decided not to (move|proceed)|no longer (moving|considering)|wish you (every )?success in your (ongoing )?job search|wish you the best in your (ongoing )?job search)\b/i

const WITHDRAWN_RE =
  /\b(withdraw(n|al)|withdraw your application|application withdrawal|you(r)? (have )?withdrawn)\b/i

const ON_HOLD_RE =
  /\b(hiring freeze|paused hiring|temporarily paused|put (the )?(role|position|process) on hold|on hold|role is (currently )?frozen)\b/i

const ACCEPTED_RE =
  /\b(you have accepted|accepted our offer|offer (has been )?accepted|welcome aboard|signed employment agreement)\b/i

const OFFER_RE =
  /\b(offer letter|job offer|pleased to (extend|offer)|we are (pleased|happy|excited|delighted) to (formally )?offer|formally offer|congratulations.{0,40}offer|extend(ing)? (you )?an offer)\b/i

const ASSESSMENT_RE =
  /\b(online (coding )?assessment|coding assessment|take[- ]home (assignment|test|challenge)|hackerrank|codility|codesignal|technical assessment)\b/i

const INTERVIEW_RE =
  /\b(interview|phone screen|recruiter screen|screening call|video (call|interview)|schedule (a |an )?(call|interview|chat|screen)|meet(ing)? with|onsite|on-site|initial screening|final (interview )?round)\b/i

const CALENDAR_INVITE_RE =
  /\b(invitation:|invitation from|updated invitation:|canceled event:|cancelled event:|calendar notification|you('ve| have) been invited|join (with )?google meet|zoom meeting invitation)\b/i

const APPLIED_RE =
  /\b(thank you for (applying|your application)|we(?:'ve| have)? received your (application|resume|cv|information)|application (was )?received|application (has been )?submitted|application to .{1,60} successfully submitted|successfully submitted|successfully applied|you applied (today|successfully)|application (acknowledg?ement|confirmation)|job application acknowledg?ement|acknowledges? receipt of your (application|resume|cv)|receipt of your (application|resume|cv)|resume received|cv received|your application is under review|we will review your application)\b/i

/** Resume/profile already submitted / representation confirmed → Applied */
const RECRUITER_STRONG_RE =
  /\b(submitted your (resume|profile)|your (resume|profile) has been (submitted|shared|sent|forwarded)|share(d|ing) (it |your (resume|profile) )?with the .{0,40} team|represent(ing)? (you|madhuja)|would like to represent|presented your (profile|candidacy)|resume will be submitted|hiring (manager|team) is reviewing|we will be representing|thank you for sending over your resume)\b/i

/** Cold / interest outreach — Opportunity, not Applied */
const RECRUITER_OUTREACH_RE =
  /\b(came across your (profile|background)|wanted to reach out|wanted to discuss|opportunit(?:y|ies) with|tech recruiters|interested in (a )?(new )?opportunit(?:y|ies)|learn about a new opportunity|exciting opportunity|great fit for|if you('re| are) interested|would you (like|be open)|would you be interested|let me know if|share more details|learn more about|please (share|send).{0,40}resume if interested|contract opportunit(?:y|ies)|inmail)\b/i

const RESUME_REQUEST_RE =
  /\b((please )?(send|share|attach).{0,40}(resume|cv)|send me your (most recent )?resume|most recent resume)\b/i

const WAITING_ON_ME_RE =
  /\b(if you('re| are) interested|please (share|send|review|reply|respond|confirm)|share an updated resume|availability for|looking forward to (your|hearing)|when (are you|would you be) available|kindly (reply|confirm)|awaiting your (reply|response)|get back to (us|me)|rsvp|let me know if|would you (like|be open)|would you be interested|select a time|use the scheduling link|let us know your decision|complete the assessment)\b/i

const NEEDS_REPLY_RE = WAITING_ON_ME_RE

const LINKEDIN_CONNECTION_RE =
  /\b(you have an invitation|wants? to connect|connect with you|accepted your (connection )?invitation|people you may know)\b/i

const LINKEDIN_INMAIL_RE =
  /\b(inmail|learn about a new opportunity|message replied|you have a new message)\b/i

function fromAddress(msg = {}) {
  return String(msg.from || '').toLowerCase()
}

export function isLinkedInMail(msg = {}) {
  return /@linkedin\.com\b/.test(fromAddress(msg))
}

/** Network connection request — not a job interview / opportunity. */
export function isLinkedInConnectionInvite(msg = {}) {
  const from = fromAddress(msg)
  if (!/@linkedin\.com\b/.test(from)) return false
  if (/invitations@linkedin\.com/.test(from)) return true
  if (/you have an invitation/i.test(String(msg.subject || ''))) return true
  const text = `${msg.subject || ''} ${msg.snippet || ''}`
  return LINKEDIN_CONNECTION_RE.test(text) && !LINKEDIN_INMAIL_RE.test(text)
}

/** Recruiter InMail / LinkedIn message — Opportunity (+ usually needs reply). */
export function isLinkedInInMailOrMessage(msg = {}) {
  const from = fromAddress(msg)
  if (!/@linkedin\.com\b/.test(from)) return false
  if (isLinkedInConnectionInvite(msg)) return false
  if (/(inmail-hit-reply|hit-reply|messages-noreply|messaging-)@linkedin\.com/.test(from)) {
    return true
  }
  const text = `${msg.subject || ''} ${msg.snippet || ''}`
  return LINKEDIN_INMAIL_RE.test(text)
}

const DOMAIN_COMPANY = {
  datadoghq: 'Datadog',
  googlemail: null,
}

function cleanCompany(name) {
  if (!name) return null
  let s = String(name).trim().replace(/^["']|["']$/g, '')
  s = s.split(/[.,;:!?\n]/)[0].trim()
  s = s.replace(/\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Team|Recruiting|Careers|Talent)\s*$/i, '').trim()
  if (s.length < 2 || s.length > 80) return null
  if (/^(hi|hello|dear|re|fw|fwd|best|regards|thanks|thank)$/i.test(s)) return null
  return s
}

function looksLikePersonName(name) {
  const n = String(name || '').trim()
  if (!n) return false
  if (/\b(recruiting|careers|talent|jobs|team|inc|llc|ltd|corp|acquisition)\b/i.test(n)) {
    return false
  }
  // "Rachel" or "Michael Smith"
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+)?$/.test(n)
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

  // Wellfound / Ashby-style: "Application to Liftoff successfully submitted"
  const appTo =
    subject.match(
      /\bApplication to\s+(.+?)\s+successfully\s+submitted\b/i,
    ) ||
    subject.match(/\bApplication to\s+(.+?)\s+(?:submitted|received|confirmed)\b/i)
  if (appTo) {
    const c = cleanCompany(appTo[1])
    // Employer from subject — do not treat single-token brands as person names.
    if (c) return c
  }

  // "… Associate Software Developer position at DarioHealth" (subject only)
  const posAt = subject.match(
    /\b(?:position|role|opening) at\s+([A-Za-z0-9&.\-]+(?:\s+[A-Za-z0-9&.\-]+){0,2})\s*$/i,
  )
  if (posAt) {
    const c = cleanCompany(posAt[1])
    if (c) return c
  }

  const submittedTo = text.match(
    /\b(?:submitted|forwarded|sent) (?:your )?(?:profile|resume|cv|application|candidacy) to\s+([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,2})\b/,
  )
  if (submittedTo) {
    const c = cleanCompany(submittedTo[1])
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
    if (
      c &&
      !/\b(senior|junior|staff|lead|developer|engineer|architect|manager|full\s*stack|react|node)\b/i.test(
        c,
      )
    ) {
      return c
    }
  }

  const oppWith = subject.match(
    /\b(?:opportunit(?:y|ies) with|role with|position (?:with|at)|Tech Lead opportunit(?:y|ies) with)\s+([A-Za-z0-9&.\-]+(?:\s+[A-Za-z0-9&.\-]+){0,3})\s*$/i,
  )
  if (oppWith) {
    const c = cleanCompany(oppWith[1])
    if (c) return c
  }

  const joinCo = subject.match(
    /\bJoin\s+([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,3})\b/,
  )
  if (joinCo) {
    const c = cleanCompany(joinCo[1])
    if (c && !looksLikePersonName(c)) return c
  }

  // Prefer subject "at Company" so snippet salutations ("Madhuja Thank…") don't stick on.
  const atCoSubj = subject.match(
    /\b(?:at|@)\s+([A-Za-z0-9&.\-]+(?:\s+[A-Za-z0-9&.\-]+){0,2})\s*$/i,
  )
  if (atCoSubj) {
    const c = cleanCompany(atCoSubj[1])
    if (
      c &&
      !/\b(Senior|Junior|Staff|Lead|Principal|Software|Frontend|Backend|Full)\b/i.test(c)
    ) {
      return c
    }
  }

  const atCo = text.match(
    /\b(?:at|@)\s+([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,2})(?=\s|$|[.,;:!?]|\b(?:thank|hi|hello|dear|after|we|your|madhuja)\b)/,
  )
  if (atCo) {
    const c = cleanCompany(atCo[1])
    if (
      c &&
      !/\b(Senior|Junior|Staff|Lead|Principal|Software|Frontend|Backend|Full)\b/.test(c)
    ) {
      return c
    }
  }

  const subjLead = subject.match(
    /^([A-Z][A-Za-z0-9&.\-]+)\s+(?:Software|Senior|Staff|Lead|Principal|Full|Frontend|Backend|React|Engineer|Developer|opportunity|interview|application)\b/i,
  )
  if (subjLead) {
    const c = cleanCompany(subjLead[1])
    if (c && !looksLikePersonName(c)) return c
  }

  const angle = from.match(/^([^<]+)</)
  if (angle) {
    let name = angle[1].trim().replace(/^"|"$/g, '')
    name = name.replace(
      /\s+(recruiting|careers|talent|jobs|noreply|no-reply|via greenhouse|via lever).*$/i,
      '',
    )
    if (!looksLikePersonName(name) && name && !/@/.test(name) && name.length < 80) {
      const c = cleanCompany(name)
      if (c) return c
    }
  }

  const domain = from.match(/@([a-z0-9.-]+)/i)
  if (domain) {
    const host = domain[1]
      .toLowerCase()
      .replace(/^(mail|email|jobs|careers|noreply|no-reply)\./, '')
    const root = host.split('.')[0]
    if (DOMAIN_COMPANY[root] === null) {
      /* skip */
    } else if (DOMAIN_COMPANY[root]) {
      return DOMAIN_COMPANY[root]
    } else if (
      root &&
      !['gmail', 'googlemail', 'yahoo', 'outlook', 'hotmail', 'icloud', 'njoyn', 'teksystems', 'roberthalf'].includes(
        root,
      )
    ) {
      return root.charAt(0).toUpperCase() + root.slice(1)
    }
  }

  const subjCo = subject.match(
    /(?:at|@|from|with)\s+([A-Z][A-Za-z0-9&.\- ]{1,40})/,
  )
  if (subjCo) return cleanCompany(subjCo[1])

  return null
}

function withAwaiting(result, text) {
  if (!result) return result
  if (result.awaiting_candidate_reply == null) {
    result.awaiting_candidate_reply = WAITING_ON_ME_RE.test(text)
  }
  return result
}

/**
 * @param {{ subject?: string, snippet?: string, from?: string }} msg
 */
export function classifyJobEmail(msg = {}) {
  const text = `${msg.subject || ''} ${msg.snippet || ''}`
  const company = guessCompany(msg)

  if (IGNORE_RE.test(text)) return null

  // LinkedIn network invites ≠ calendar/interview (was creating fake Blend interviews).
  if (isLinkedInConnectionInvite(msg)) return null

  // LinkedIn InMail / messaging → Opportunity (+ reply), never interview_event.
  if (isLinkedInInMailOrMessage(msg)) {
    if (
      REJECT_RE.test(text) ||
      WITHDRAWN_RE.test(text) ||
      OFFER_RE.test(text) ||
      ACCEPTED_RE.test(text)
    ) {
      // Fall through to normal status rules below.
    } else {
      if (company) {
        return {
          kind: 'new_opportunity',
          proposed_status: 'opportunity',
          proposed_company: company,
          proposed_role: null,
          proposed_title: msg.subject || 'LinkedIn opportunity',
          awaiting_candidate_reply: true,
        }
      }
      return {
        kind: 'needs_reply',
        proposed_status: 'opportunity',
        proposed_company: null,
        proposed_title: msg.subject || 'LinkedIn message',
        awaiting_candidate_reply: true,
      }
    }
  }

  if (REJECT_RE.test(text)) {
    return {
      kind: 'status_update',
      proposed_status: 'rejected',
      proposed_company: company,
      proposed_title: msg.subject || 'Rejection',
      awaiting_candidate_reply: false,
    }
  }

  if (WITHDRAWN_RE.test(text)) {
    return {
      kind: 'status_update',
      proposed_status: 'withdrawn',
      proposed_company: company,
      proposed_title: msg.subject || 'Withdrawn',
      awaiting_candidate_reply: false,
    }
  }

  if (ON_HOLD_RE.test(text)) {
    return {
      kind: 'status_update',
      proposed_status: 'not_selected',
      proposed_company: company,
      proposed_title: msg.subject || 'On hold',
      awaiting_candidate_reply: false,
    }
  }

  if (ACCEPTED_RE.test(text)) {
    return {
      kind: 'status_update',
      proposed_status: 'offer',
      proposed_company: company,
      proposed_title: msg.subject || 'Offer accepted',
      awaiting_candidate_reply: false,
    }
  }

  if (OFFER_RE.test(text)) {
    return withAwaiting(
      {
        kind: 'status_update',
        proposed_status: 'offer',
        proposed_company: company,
        proposed_title: msg.subject || 'Offer',
      },
      text,
    )
  }

  if (ASSESSMENT_RE.test(text)) {
    return withAwaiting(
      {
        kind: 'interview_event',
        proposed_status: 'interviewing',
        proposed_company: company,
        proposed_title: msg.subject || 'Assessment',
      },
      text,
    )
  }

  // Resume ask before weak "interest" acks — Opportunity (+ reply)
  if (RESUME_REQUEST_RE.test(text) && !APPLIED_RE.test(text) && !RECRUITER_STRONG_RE.test(text)) {
    if (company) {
      return {
        kind: 'new_opportunity',
        proposed_status: 'opportunity',
        proposed_company: company,
        proposed_title: msg.subject || 'Job opportunity',
        awaiting_candidate_reply: true,
      }
    }
    return {
      kind: 'needs_reply',
      proposed_status: 'opportunity',
      proposed_company: null,
      proposed_title: msg.subject || 'Needs reply',
      awaiting_candidate_reply: true,
    }
  }

  // Application receipt before "interview availability" wording (Uber-style)
  if (APPLIED_RE.test(text)) {
    return {
      kind: 'new_application',
      proposed_status: 'applied',
      proposed_company: company,
      proposed_title: msg.subject || 'Application received',
      awaiting_candidate_reply: WAITING_ON_ME_RE.test(text),
    }
  }

  if (RECRUITER_STRONG_RE.test(text)) {
    const awaiting = WAITING_ON_ME_RE.test(text)
    if (!company) {
      if (awaiting) {
        return {
          kind: 'needs_reply',
          proposed_status: 'opportunity',
          proposed_company: null,
          proposed_title: msg.subject || 'Needs reply',
          awaiting_candidate_reply: true,
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

  if (
    !isLinkedInMail(msg) &&
    (CALENDAR_INVITE_RE.test(text) || INTERVIEW_RE.test(text))
  ) {
    return withAwaiting(
      {
        kind: 'interview_event',
        proposed_status: 'interviewing',
        proposed_company: company,
        proposed_title: msg.subject || 'Interview',
      },
      text,
    )
  }

  // Non-InMail LinkedIn mail that still mentions an interview (rare) — allow.
  if (isLinkedInMail(msg) && INTERVIEW_RE.test(text) && !isLinkedInInMailOrMessage(msg)) {
    return withAwaiting(
      {
        kind: 'interview_event',
        proposed_status: 'interviewing',
        proposed_company: company,
        proposed_title: msg.subject || 'Interview',
      },
      text,
    )
  }

  if (RECRUITER_OUTREACH_RE.test(text)) {
    if (!company) {
      return {
        kind: 'needs_reply',
        proposed_status: 'opportunity',
        proposed_company: null,
        proposed_title: msg.subject || 'Recruiter outreach',
        awaiting_candidate_reply: true,
      }
    }
    return {
      kind: 'new_opportunity',
      proposed_status: 'opportunity',
      proposed_company: company,
      proposed_title: msg.subject || 'Job opportunity',
      awaiting_candidate_reply: true,
    }
  }

  if (NEEDS_REPLY_RE.test(text)) {
    return {
      kind: 'needs_reply',
      proposed_status: company ? 'opportunity' : null,
      proposed_company: company,
      proposed_title: msg.subject || 'Needs reply',
      awaiting_candidate_reply: true,
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
