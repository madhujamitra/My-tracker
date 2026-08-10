import { corsHeaders, json } from '../_shared/cors.js'
import {
  requireUser,
  adminClient,
  refreshAccessToken,
} from '../_shared/google.js'
import { classifyJobEmail, matchApplication } from '../_shared/classify.js'

function headerValue(headers, name) {
  const h = (headers || []).find(
    (x) => String(x.name).toLowerCase() === name.toLowerCase(),
  )
  return h?.value || ''
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

async function ensureApplication(admin, userId, apps, company, status, notes) {
  const name = company || 'Unknown company'
  const matched = matchApplication(apps, name)
  const now = new Date().toISOString()
  if (matched) {
    if (status && matched.status !== status) {
      await admin
        .from('applications')
        .update({
          status,
          last_activity_at: now,
          updated_at: now,
        })
        .eq('user_id', userId)
        .eq('id', matched.id)
      matched.status = status
    } else {
      await admin
        .from('applications')
        .update({ last_activity_at: now, updated_at: now })
        .eq('user_id', userId)
        .eq('id', matched.id)
    }
    return matched
  }
  const { data, error } = await admin
    .from('applications')
    .insert({
      user_id: userId,
      company: name,
      status: status || 'applied',
      applied_at: now.slice(0, 10),
      last_activity_at: now,
      notes: notes || null,
      updated_at: now,
    })
    .select('id, company, status')
    .single()
  if (error) throw error
  apps.push(data)
  return data
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

    // Last 7 days — job signals + needs-reply cues
    const q =
      'newer_than:7d (label:job-tracker OR subject:(application OR interview OR invitation OR unfortunately OR "thank you for applying" OR "received your application" OR "looking forward" OR "please reply" OR "please confirm" OR RSVP))'
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
      .select('id, company, status')
      .eq('user_id', user.id)
    const apps = appsData || []

    const summary = {
      scanned: messages.length,
      applications: 0,
      rejected: 0,
      interviews: 0,
      needs_reply: 0,
      skipped: 0,
    }

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
      const classified = classifyJobEmail({ subject, snippet, from })
      if (!classified) {
        summary.skipped += 1
        continue
      }

      const { data: existing } = await admin
        .from('gmail_proposals')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('gmail_message_id', m.id)
        .eq('kind', classified.kind)
        .maybeSingle()
      if (existing && (existing.status === 'applied' || existing.status === 'accepted')) {
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
        if (classified.kind === 'new_application') {
          const app = await ensureApplication(
            admin,
            user.id,
            apps,
            company,
            'applied',
            `From Gmail: ${subject}`,
          )
          audit.application_id = app.id
          await markProcessed(admin, audit)
          summary.applications += 1
        } else if (classified.kind === 'status_update') {
          const app = await ensureApplication(
            admin,
            user.id,
            apps,
            company,
            classified.proposed_status || 'rejected',
            `From Gmail: ${subject}`,
          )
          audit.application_id = app.id
          await markProcessed(admin, audit)
          if ((classified.proposed_status || 'rejected') === 'rejected') {
            summary.rejected += 1
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
            `From Gmail: ${subject}`,
          )
          const starts = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          // Avoid duplicate events for same gmail message title+app in last week
          const { data: existingEv } = await admin
            .from('interview_events')
            .select('id')
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
              notes: snippet || null,
            })
          }
          audit.application_id = app.id
          await markProcessed(admin, audit)
          summary.interviews += 1
        } else if (classified.kind === 'needs_reply') {
          let receivedAt = null
          if (dateHdr) {
            const d = new Date(dateHdr)
            if (!Number.isNaN(d.getTime())) receivedAt = d.toISOString()
          }
          await admin.from('mail_needs_reply').upsert(
            {
              user_id: user.id,
              gmail_message_id: m.id,
              subject,
              snippet,
              from_email: from,
              received_at: receivedAt,
              status: 'open',
            },
            { onConflict: 'user_id,gmail_message_id' },
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
