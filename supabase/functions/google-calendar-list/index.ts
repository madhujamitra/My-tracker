import { corsHeaders, json } from '../_shared/cors.js'
import {
  requireUser,
  adminClient,
  refreshAccessToken,
} from '../_shared/google.js'

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

function mapEvent(ev) {
  return {
    id: ev.id,
    summary: ev.summary || '(No title)',
    description: ev.description || null,
    location: ev.location || null,
    htmlLink: ev.htmlLink || null,
    status: ev.status || null,
    start: ev.start?.dateTime || ev.start?.date || null,
    end: ev.end?.dateTime || ev.end?.date || null,
    hangoutLink: ev.hangoutLink || ev.conferenceData?.entryPoints?.[0]?.uri || null,
  }
}

/** Paginate Calendar API so past busy months don't drop today/future invites. */
async function fetchPrimaryEvents(accessToken, timeMin, timeMax) {
  const items = []
  let pageToken = ''
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    )
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('maxResults', '250')
    // Pending interview invites the user hasn't accepted yet
    url.searchParams.set('showHiddenInvitations', 'true')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await res.json()
    if (!res.ok) {
      const msg = body.error?.message || 'Calendar API failed'
      const err = new Error(msg)
      err.status = res.status
      throw err
    }
    for (const ev of body.items || []) {
      if (ev.status === 'cancelled') continue
      items.push(mapEvent(ev))
    }
    pageToken = body.nextPageToken || ''
    if (!pageToken) break
  }
  return items
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
    if (!conn) throw new Error('Gmail not connected — connect under Modules first')

    const accessToken = await ensureAccessToken(admin, conn)

    const now = new Date()
    // Only today + future (past events are not useful for scheduling invites).
    const timeMin = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    ).toISOString()
    // ~6 months ahead so interview loops still show up
    const timeMax = new Date(
      now.getFullYear(),
      now.getMonth() + 6,
      now.getDate(),
      23,
      59,
      59,
    ).toISOString()

    let events
    try {
      events = await fetchPrimaryEvents(accessToken, timeMin, timeMax)
    } catch (apiErr) {
      const msg = apiErr?.message || String(apiErr)
      if (
        String(msg).toLowerCase().includes('insufficient') ||
        apiErr?.status === 403
      ) {
        throw new Error(
          'Calendar access missing — Disconnect Gmail, then Connect again to grant Calendar permission',
        )
      }
      throw apiErr
    }

    return json({
      ok: true,
      events,
      meta: { timeMin, timeMax, count: events.length },
    })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
