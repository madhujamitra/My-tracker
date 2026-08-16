/**
 * Calendar day the email was sent/received as written in the Date header
 * (not UTC — avoids Pacific evening → next UTC day).
 * Keep in sync with src/lib/emailDate.js
 */

const MONTHS = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** YYYY-MM-DD from RFC2822 Date header calendar fields. */
export function emailDateToIsoDate(dateHdr, fallbackDate = new Date()) {
  if (dateHdr) {
    const m = String(dateHdr).match(
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
    )
    if (m) {
      const mon = MONTHS[m[2].toLowerCase().slice(0, 3)]
      if (mon) return `${m[3]}-${mon}-${pad2(m[1])}`
    }
  }
  return formatLocalYmd(fallbackDate)
}

/** Gmail internalDate (epoch ms string/number) → YYYY-MM-DD in local of runtime. Prefer Date header when present. */
export function internalDateToIsoDate(internalDate, fallbackDate = new Date()) {
  if (internalDate == null || internalDate === '') {
    return formatLocalYmd(fallbackDate)
  }
  const ms = Number(internalDate)
  if (!Number.isFinite(ms)) return formatLocalYmd(fallbackDate)
  return formatLocalYmd(new Date(ms))
}

function formatLocalYmd(d) {
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) {
    const n = new Date()
    return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`
  }
  // Prefer UTC date for internalDate fallback only when no header —
  // Edge runs UTC; for tests we still want stable. Use UTC components.
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

/** Keep earlier applied date (email arrival), never push forward. */
export function earlierIsoDate(a, b) {
  if (!a) return b || null
  if (!b) return a
  return a <= b ? a : b
}

/**
 * Best-effort interview start from Gmail invite subject/snippet.
 * Prefer the latest message text (booked/scheduled lines), not older quotes.
 */
export function parseInviteStartsAt(text = {}, fallbackMs = Date.now() + 86400000) {
  const raw = `${text.subject || ''} ${text.snippet || ''}`
  const months = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }

  // "Thursday, August 13, 2026, at 11:30 AM PST"
  const booked = raw.match(
    /\b(?:booked|scheduled).{0,40}?(?:for\s+)?(?:[A-Za-z]+,\s+)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4}).{0,20}?(\d{1,2}):(\d{2})\s*(am|pm)\b/i,
  )
  if (booked) {
    const mon = months[booked[1].toLowerCase().slice(0, 3)]
    if (mon != null) {
      let hour = Number(booked[4])
      const min = Number(booked[5])
      const ap = booked[6].toLowerCase()
      if (ap === 'pm' && hour < 12) hour += 12
      if (ap === 'am' && hour === 12) hour = 0
      const d = new Date(Number(booked[3]), mon, Number(booked[2]), hour, min, 0, 0)
      if (!Number.isNaN(d.getTime())) return d.toISOString()
    }
  }

  const m = raw.match(
    /@\s*(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)/i,
  )
  if (m) {
    const mon = months[m[1].toLowerCase().slice(0, 3)]
    if (mon != null) {
      let hour = Number(m[4])
      const min = Number(m[5])
      const ap = m[6].toLowerCase()
      if (ap === 'pm' && hour < 12) hour += 12
      if (ap === 'am' && hour === 12) hour = 0
      const day = Number(m[2])
      const year = Number(m[3])
      const d = new Date(year, mon, day, hour, min, 0, 0)
      if (!Number.isNaN(d.getTime())) return d.toISOString()
    }
  }
  return new Date(fallbackMs).toISOString()
}
