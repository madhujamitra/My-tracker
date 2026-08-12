import { corsHeaders, json } from '../_shared/cors.js'
import {
  requireUser,
  adminClient,
  refreshAccessToken,
} from '../_shared/google.js'
import {
  classifyJobEmail,
  matchApplication,
  isLinkedInConnectionInvite,
  isLinkedInInMailOrMessage,
} from '../_shared/classify.js'
import {
  loadUserAiClient,
  classifyWithLlm,
} from '../_shared/llmClassify.js'
import {
  emailDateToIsoDate,
  earlierIsoDate,
  internalDateToIsoDate,
  parseInviteStartsAt,
} from '../_shared/emailDate.js'
import { pickForwardStatus } from '../_shared/pipelineStatus.js'

/** Cap LLM calls per sync — cost + latency bound. */
const MAX_AI_CALLS = 15

/** Soft rejects often hide past Gmail's short snippet — only fetch body for likely app updates. */
const APPLICATION_UPDATE_SUBJECT_RE =
  /\b(your application|application (to|for|update|status)|position:|update on your|thank you for (your )?interest|thank you for applying|selection process|after reviewing)\b/i

/** "Thank you for applying" subjects often hide soft rejects past the snippet. */
const MAYBE_SOFT_REJECT_SUBJECT_RE =
  /\b(thank you for applying|update on your application|your application to|application (update|status|for))\b/i

function headerValue(headers, name) {
  const h = (headers || []).find(
    (x) => String(x.name).toLowerCase() === name.toLowerCase(),
  )
  return h?.value || ''
}

function decodeBase64Url(data) {
  if (!data) return ''
  try {
    const pad = '='.repeat((4 - (data.length % 4)) % 4)
    const b64 = (data + pad).replace(/-/g, '+').replace(/_/g, '/')
    return atob(b64)
  } catch {
    return ''
  }
}

/** Prefer text/plain; fall back to stripped text/html. */
function extractPlainText(payload, depth = 0) {
  if (!payload || depth > 8) return ''
  const mime = String(payload.mimeType || '').toLowerCase()
  if (mime === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  const parts = payload.parts || []
  for (const p of parts) {
    if (String(p.mimeType || '').toLowerCase() === 'text/plain' && p.body?.data) {
      return decodeBase64Url(p.body.data)
    }
  }
  for (const p of parts) {
    const nested = extractPlainText(p, depth + 1)
    if (nested) return nested
  }
  if (mime === 'text/html' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  for (const p of parts) {
    if (String(p.mimeType || '').toLowerCase() === 'text/html' && p.body?.data) {
      return decodeBase64Url(p.body.data)
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }
  }
  return ''
}

async function fetchBodyExcerpt(accessToken, messageId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return ''
  const full = await res.json()
  const text = extractPlainText(full.payload)
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1800)
}

async function ensureAccessToken(admin, row) {
  const expires = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0
  if (row.access_token && expires > Date.now() + 60_000) {
    return row.access_token
  }
  const tokens = await refreshAccessToken(row.refresh_token)
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null
  await admin
    .from('gmail_connections')
    .update({
      access_token: tokens.access_token,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', row.user_id)
  return tokens.access_token
}

async function markProcessed(admin, row) {
  const now = new Date().toISOString()
  await admin.from('gmail_proposals').upsert(
    {
      ...row,
      status: 'applied',
      resolved_at: now,
    },
    { onConflict: 'user_id,gmail_message_id,kind' },
  )
}

/** Marketplace / ATS submission receipts — Applied, never interview. */
function isClearApplicationReceipt(text) {
  return /\b(successfully submitted|application (has been )?submitted|you applied today|application to .{1,80} successfully submitted)\b/i.test(
    String(text || ''),
  )
}

/**
 * Create or update application.
 * applied_at = email arrival day; on match, only move earlier (never later).
 */
async function ensureApplication(
  admin,
  userId,
  apps,
  company,
  status,
  notes,
  appliedAt,
  role,
) {
  const name = company || 'Unknown company'
  const matched = matchApplication(apps, name)
  const now = new Date().toISOString()
  const roleTrim = role ? String(role).trim() : ''
  if (matched) {
    const nextApplied = earlierIsoDate(matched.applied_at, appliedAt)
    let nextStatus = status
      ? pickForwardStatus(matched.status, status)
      : matched.status
    // Clear "successfully submitted" receipts must stay Applied — correct prior
    // mislabels that set Interviewing from Wellfound/Ashby confirmation mail.
    if (
      status === 'applied' &&
      isClearApplicationReceipt(notes) &&
      matched.status === 'interviewing'
    ) {
      nextStatus = 'applied'
    }
    const patch = {
      last_activity_at: now,
      updated_at: now,
    }
    if (nextStatus && nextStatus !== matched.status) {
      patch.status = nextStatus
      matched.status = nextStatus
    }
    if (nextApplied && nextApplied !== matched.applied_at) {
      patch.applied_at = nextApplied
      matched.applied_at = nextApplied
    }
    if (roleTrim && !matched.role) {
      patch.role = roleTrim
      matched.role = roleTrim
    }
    // Refresh thin "From Gmail" notes with subject + open URL when missing.
    if (
      notes &&
      (!matched.notes ||
        (/^From Gmail/i.test(matched.notes) &&
          !/mail\.google\.com/i.test(matched.notes)) ||
        (isClearApplicationReceipt(notes) &&
          matched.notes !== notes))
    ) {
      patch.notes = notes
      matched.notes = notes
    }
    await admin
      .from('applications')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', matched.id)

    if (
      status === 'applied' &&
      isClearApplicationReceipt(notes) &&
      nextStatus === 'applied'
    ) {
      // Drop fake interview rows created from the same submission subject.
      await admin
        .from('interview_events')
        .delete()
        .eq('user_id', userId)
        .eq('application_id', matched.id)
        .ilike('title', '%successfully submitted%')
    }
    return matched
  }
  const insertRow = {
    user_id: userId,
    company: name,
    status: status || 'applied',
    applied_at: appliedAt || now.slice(0, 10),
    last_activity_at: now,
    notes: notes || null,
    updated_at: now,
  }
  if (roleTrim) insertRow.role = roleTrim
  const { data, error } = await admin
    .from('applications')
    .insert(insertRow)
    .select('id, company, status, applied_at, role, notes')
    .single()
  if (error) throw error
  apps.push(data)
  return data
}

/** Fix applied_at on an existing app id (re-sync / already-processed mail). */
async function backfillAppliedAt(admin, userId, appId, appliedAt, apps) {
  if (!appId || !appliedAt) return false
  const row = apps.find((a) => a.id === appId)
  const current = row?.applied_at
  const next = earlierIsoDate(current, appliedAt)
  if (!next || next === current) {
    // Still fetch if not in memory
    if (row) return false
  }
  const { data: existing } = await admin
    .from('applications')
    .select('id, company, status, applied_at')
    .eq('user_id', userId)
    .eq('id', appId)
    .maybeSingle()
  if (!existing) return false
  const corrected = earlierIsoDate(existing.applied_at, appliedAt)
  if (!corrected || corrected === existing.applied_at) return false
  await admin
    .from('applications')
    .update({
      applied_at: corrected,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', appId)
  existing.applied_at = corrected
  const mem = apps.find((a) => a.id === appId)
  if (mem) mem.applied_at = corrected
  else apps.push(existing)
  return true
}

async function upsertNeedsReply(admin, userId, mId, subject, snippet, from, dateHdr) {
  let receivedAt = null
  if (dateHdr) {
    const d = new Date(dateHdr)
    if (!Number.isNaN(d.getTime())) receivedAt = d.toISOString()
  }
  await admin.from('mail_needs_reply').upsert(
    {
      user_id: userId,
      gmail_message_id: mId,
      subject,
      snippet,
      from_email: from,
      received_at: receivedAt,
      status: 'open',
    },
    { onConflict: 'user_id,gmail_message_id' },
  )
}

/** Deep-link into Gmail web (thread id preferred). */
function gmailWebUrl(threadId, messageId) {
  const id = threadId || messageId
  if (!id) return null
  return `https://mail.google.com/mail/u/0/#all/${id}`
}

/** Notes that make the source email findable: subject + Open URL (+ short preview). */
function formatGmailNotes({ subject, snippet, threadId, messageId }) {
  const lines = ['From Gmail']
  const subj = String(subject || '').trim()
  if (subj) lines.push(`Subject: ${subj}`)
  const url = gmailWebUrl(threadId, messageId)
  if (url) lines.push(url)
  const preview = String(snippet || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (preview && preview !== subj) {
    lines.push(`Preview: ${preview.slice(0, 220)}`)
  }
  return lines.join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await requireUser(req)
    const admin = adminClient()

    const { data: conn, error: connErr } = await admin
      .from('gmail_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (connErr) throw connErr
    if (!conn) throw new Error('Gmail not connected')

    const accessToken = await ensureAccessToken(admin, conn)
    const aiClient = await loadUserAiClient(admin, user.id)

    const q =
      'newer_than:7d (label:job-tracker OR subject:(application OR interview OR invitation OR Invitation OR screening OR opportunity OR Opportunities OR interested OR resume OR recruiters OR unfortunately OR "thank you for applying" OR "received your application" OR "looking forward" OR "please reply" OR "please confirm" OR RSVP OR offer OR acknowledgement OR acknowledgment))'
    const listUrl = new URL(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages',
    )
    listUrl.searchParams.set('q', q)
    listUrl.searchParams.set('maxResults', '50')

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listJson = await listRes.json()
    if (!listRes.ok) {
      throw new Error(listJson.error?.message || 'Gmail list failed')
    }

    const messages = listJson.messages || []
    const { data: appsData } = await admin
      .from('applications')
      .select('id, company, status, applied_at, role, notes')
      .eq('user_id', user.id)
    const apps = appsData || []

    const summary = {
      scanned: messages.length,
      applications: 0,
      rejected: 0,
      offers: 0,
      interviews: 0,
      needs_reply: 0,
      skipped: 0,
      dates_corrected: 0,
      ai_enabled: Boolean(aiClient),
      ai_calls: 0,
      ai_hits: 0,
      ai_errors: 0,
    }

    let aiDisabledForRun = false

    for (const m of messages) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const msg = await msgRes.json()
      if (!msgRes.ok) {
        summary.skipped += 1
        continue
      }

      const headers = msg.payload?.headers || []
      const subject = headerValue(headers, 'Subject')
      const from = headerValue(headers, 'From')
      const dateHdr = headerValue(headers, 'Date')
      const snippet = msg.snippet || ''
      const threadId = msg.threadId || m.threadId || null
      const mail = { subject, snippet, from }
      const appliedAt = dateHdr
        ? emailDateToIsoDate(dateHdr)
        : internalDateToIsoDate(msg.internalDate)

      let classified = classifyJobEmail(mail)

      // LinkedIn connection invites are noise — never send to AI / never create apps.
      if (!classified && isLinkedInConnectionInvite(mail)) {
        summary.skipped += 1
        continue
      }

      const linkedInMsg = isLinkedInInMailOrMessage(mail)

      // Soft-reject body excerpt OR LinkedIn InMail body for AI context.
      // Also re-check "thank you for applying" applied hits — soft rejects hide past snippet.
      if (
        (!classified && APPLICATION_UPDATE_SUBJECT_RE.test(subject)) ||
        (classified?.kind === 'new_application' &&
          MAYBE_SOFT_REJECT_SUBJECT_RE.test(subject)) ||
        (linkedInMsg && aiClient && !aiDisabledForRun)
      ) {
        try {
          const excerpt = await fetchBodyExcerpt(accessToken, m.id)
          if (excerpt && excerpt.length > String(mail.snippet || '').length + 40) {
            mail.snippet = `${snippet} ${excerpt}`.trim()
            classified = classifyJobEmail(mail)
          }
        } catch (bodyErr) {
          console.error('body excerpt failed', m.id, bodyErr)
        }
      }

      // Keep notes preview aligned with the text we actually classified on.
      const sourceNotes = formatGmailNotes({
        subject,
        snippet: mail.snippet || snippet,
        threadId,
        messageId: m.id,
      })

      // Prefer AI for LinkedIn InMail/message context; otherwise AI only on heuristic miss.
      const wantAi =
        aiClient &&
        !aiDisabledForRun &&
        summary.ai_calls < MAX_AI_CALLS &&
        (linkedInMsg || !classified) &&
        // Never spend AI (or let it override) on clear submission receipts.
        !isClearApplicationReceipt(`${subject} ${mail.snippet || snippet}`)

      if (wantAi) {
        summary.ai_calls += 1
        try {
          const llmHit = await classifyWithLlm(mail, aiClient)
          if (llmHit) {
            classified = llmHit
            summary.ai_hits += 1
          }
        } catch (llmErr) {
          summary.ai_errors += 1
          console.error('LLM classify failed', llmErr)
          if (
            llmErr?.status === 401 ||
            llmErr?.status === 403 ||
            llmErr?.status === 429
          ) {
            aiDisabledForRun = true
          }
        }
      }

      // Safety: never promote LinkedIn connection / InMail to interview via AI slip.
      if (
        classified?.kind === 'interview_event' &&
        (isLinkedInConnectionInvite(mail) || isLinkedInInMailOrMessage(mail))
      ) {
        classified = classifyJobEmail(mail) || {
          kind: 'needs_reply',
          proposed_status: 'opportunity',
          proposed_company: classified.proposed_company || null,
          proposed_title: subject || 'LinkedIn message',
          awaiting_candidate_reply: true,
        }
      }

      // Safety: submission receipts are Applied, never interview.
      if (
        classified?.kind === 'interview_event' &&
        isClearApplicationReceipt(`${subject} ${mail.snippet || snippet}`)
      ) {
        classified = classifyJobEmail(mail) || {
          kind: 'new_application',
          proposed_status: 'applied',
          proposed_company: classified.proposed_company || null,
          proposed_title: subject || 'Application submitted',
          awaiting_candidate_reply: false,
        }
      }

      if (!classified) {
        summary.skipped += 1
        continue
      }

      const { data: existing } = await admin
        .from('gmail_proposals')
        .select('id, status, application_id, proposed_company, kind')
        .eq('user_id', user.id)
        .eq('gmail_message_id', m.id)
        .eq('kind', classified.kind)
        .maybeSingle()
      if (
        existing &&
        (existing.status === 'applied' || existing.status === 'accepted')
      ) {
        // Already applied — still fix wrong sync-day applied_at from this email
        let appId = existing.application_id
        if (!appId && existing.proposed_company) {
          const hit = matchApplication(apps, existing.proposed_company)
          appId = hit?.id || null
        }
        if (!appId && classified.proposed_company) {
          const hit = matchApplication(apps, classified.proposed_company)
          appId = hit?.id || null
        }
        if (
          appId &&
          ['new_application', 'status_update', 'interview_event'].includes(
            classified.kind,
          )
        ) {
          const fixed = await backfillAppliedAt(
            admin,
            user.id,
            appId,
            appliedAt,
            apps,
          )
          if (fixed) summary.dates_corrected += 1
          // Backfill subject + Gmail URL onto thin notes from older syncs.
          const mem = apps.find((a) => a.id === appId)
          if (
            sourceNotes &&
            (!mem?.notes ||
              (/^From Gmail/i.test(mem.notes) &&
                !/mail\.google\.com/i.test(mem.notes)))
          ) {
            await admin
              .from('applications')
              .update({
                notes: sourceNotes,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)
              .eq('id', appId)
            if (mem) mem.notes = sourceNotes
          }
          // Re-apply clear submission receipts so Interviewing mislabels get corrected.
          if (
            classified.kind === 'new_application' &&
            isClearApplicationReceipt(`${subject} ${mail.snippet || snippet}`)
          ) {
            await ensureApplication(
              admin,
              user.id,
              apps,
              classified.proposed_company || mem?.company || 'Unknown company',
              'applied',
              sourceNotes,
              appliedAt,
              classified.proposed_role,
            )
          }
        }
        summary.skipped += 1
        continue
      }

      const company = classified.proposed_company || 'Unknown company'
      const audit = {
        user_id: user.id,
        gmail_message_id: m.id,
        kind: classified.kind,
        subject,
        snippet,
        from_email: from,
        proposed_company: classified.proposed_company,
        proposed_role: null,
        proposed_status: classified.proposed_status || null,
        proposed_starts_at: null,
        proposed_title: classified.proposed_title,
        application_id: null,
      }

      try {
        if (classified.kind === 'new_opportunity') {
          const app = await ensureApplication(
            admin,
            user.id,
            apps,
            company,
            'opportunity',
            sourceNotes,
            appliedAt,
            classified.proposed_role,
          )
          audit.application_id = app.id
          audit.proposed_role = classified.proposed_role || null
          if (classified.awaiting_candidate_reply) {
            await upsertNeedsReply(
              admin,
              user.id,
              m.id,
              subject,
              snippet,
              from,
              dateHdr,
            )
            summary.needs_reply += 1
          }
          await markProcessed(admin, audit)
          summary.applications += 1
        } else if (classified.kind === 'new_application') {
          const app = await ensureApplication(
            admin,
            user.id,
            apps,
            company,
            'applied',
            sourceNotes,
            appliedAt,
            classified.proposed_role,
          )
          audit.application_id = app.id
          audit.proposed_role = classified.proposed_role || null
          if (classified.awaiting_candidate_reply) {
            await upsertNeedsReply(
              admin,
              user.id,
              m.id,
              subject,
              snippet,
              from,
              dateHdr,
            )
            summary.needs_reply += 1
          }
          await markProcessed(admin, audit)
          summary.applications += 1
        } else if (classified.kind === 'status_update') {
          const status = classified.proposed_status || 'rejected'
          const app = await ensureApplication(
            admin,
            user.id,
            apps,
            company,
            status,
            sourceNotes,
            appliedAt,
          )
          audit.application_id = app.id
          await markProcessed(admin, audit)
          if (status === 'rejected' || status === 'not_selected') {
            summary.rejected += 1
          } else if (status === 'offer') {
            summary.offers += 1
          } else {
            summary.applications += 1
          }
        } else if (classified.kind === 'interview_event') {
          const app = await ensureApplication(
            admin,
            user.id,
            apps,
            company,
            'interviewing',
            sourceNotes,
            appliedAt,
          )
          const starts = parseInviteStartsAt({ subject, snippet })
          audit.proposed_starts_at = starts
          const { data: existingEv } = await admin
            .from('interview_events')
            .select('id, notes')
            .eq('user_id', user.id)
            .eq('application_id', app.id)
            .eq('title', classified.proposed_title || subject || 'Interview')
            .maybeSingle()
          if (!existingEv) {
            await admin.from('interview_events').insert({
              user_id: user.id,
              application_id: app.id,
              title: classified.proposed_title || subject || 'Interview',
              event_type: 'interview',
              starts_at: starts,
              notes: sourceNotes,
            })
          } else if (
            !existingEv.notes ||
            !/mail\.google\.com/i.test(existingEv.notes)
          ) {
            await admin
              .from('interview_events')
              .update({ notes: sourceNotes })
              .eq('id', existingEv.id)
              .eq('user_id', user.id)
          }
          audit.application_id = app.id
          await markProcessed(admin, audit)
          summary.interviews += 1
        } else if (classified.kind === 'needs_reply') {
          if (company) {
            const app = await ensureApplication(
              admin,
              user.id,
              apps,
              company,
              'opportunity',
              sourceNotes,
              appliedAt,
              classified.proposed_role,
            )
            audit.application_id = app.id
            audit.proposed_role = classified.proposed_role || null
          }
          await upsertNeedsReply(
            admin,
            user.id,
            m.id,
            subject,
            snippet,
            from,
            dateHdr,
          )
          await markProcessed(admin, audit)
          summary.needs_reply += 1
        } else {
          summary.skipped += 1
        }
      } catch (applyErr) {
        console.error('apply failed', applyErr)
        summary.skipped += 1
      }
    }

    await admin
      .from('gmail_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return json({ ok: true, ...summary })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
