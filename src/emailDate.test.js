import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  earlierIsoDate,
  emailDateToIsoDate,
  parseInviteStartsAt,
} from './lib/emailDate.js'

describe('emailDateToIsoDate', () => {
  it('uses calendar day from Date header (not UTC shift)', () => {
    // 8:44pm Pacific Aug 3 → would be Aug 4 UTC if using toISOString
    assert.equal(
      emailDateToIsoDate('Mon, 3 Aug 2026 20:44:00 -0700'),
      '2026-08-03',
    )
    assert.equal(
      emailDateToIsoDate('Mon, 3 Aug 2026 08:44:00 -0700'),
      '2026-08-03',
    )
  })

  it('falls back when header missing', () => {
    assert.equal(
      emailDateToIsoDate(null, new Date('2026-08-10T12:00:00Z')),
      '2026-08-10',
    )
  })
})

describe('earlierIsoDate', () => {
  it('keeps the earlier arrival day', () => {
    assert.equal(earlierIsoDate('2026-08-10', '2026-08-03'), '2026-08-03')
    assert.equal(earlierIsoDate('2026-08-03', '2026-08-10'), '2026-08-03')
    assert.equal(earlierIsoDate(null, '2026-08-03'), '2026-08-03')
  })
})

describe('parseInviteStartsAt', () => {
  it('parses Gmail invitation subject datetime', () => {
    const iso = parseInviteStartsAt({
      subject:
        'Invitation from an unknown sender: Madhuja Mitra and Hairanica Gonzalez @ Tue Aug 4, 2026 5:30pm - 6pm (GMT-7)',
    })
    const d = new Date(iso)
    assert.equal(d.getFullYear(), 2026)
    assert.equal(d.getMonth(), 7)
    assert.equal(d.getDate(), 4)
    assert.equal(d.getHours(), 17)
    assert.equal(d.getMinutes(), 30)
  })

  it('parses booked call from latest email body', () => {
    const iso = parseInviteStartsAt({
      subject: 'Cover Genius: Senior Software Engineer (CG Admin) - Vancouver, BC',
      snippet:
        'I have booked our call for Thursday, August 13, 2026, at 11:30 AM PST.',
    })
    const d = new Date(iso)
    assert.equal(d.getFullYear(), 2026)
    assert.equal(d.getMonth(), 7)
    assert.equal(d.getDate(), 13)
    assert.equal(d.getHours(), 11)
    assert.equal(d.getMinutes(), 30)
  })
})
