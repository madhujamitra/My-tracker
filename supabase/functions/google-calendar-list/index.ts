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
    // Wide enough for month-grid navigation (± ~45 days from today)
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString()

    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    )
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('maxResults', '100')

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await res.json()
    if (!res.ok) {
      const msg = body.error?.message || 'Calendar API failed'
      if (String(msg).toLowerCase().includes('insufficient') || res.status === 403) {
        throw new Error(
          'Calendar access missing — Disconnect Gmail, then Connect again to grant Calendar permission',
        )
      }
      throw new Error(msg)
    }

    const events = (body.items || []).map((ev) => ({
      id: ev.id,
      summary: ev.summary || '(No title)',
      description: ev.description || null,
      location: ev.location || null,
      htmlLink: ev.htmlLink || null,
      status: ev.status || null,
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      hangoutLink: ev.hangoutLink || null,
    }))

    return json({ ok: true, events })
  } catch (err) {
    return json({ error: err.message || String(err) }, 400)
  }
})
