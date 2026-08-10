import { findStaleApplicationIds, isStaleApplication } from './lib/staleApplications.js'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('staleApplications', () => {
  const now = new Date('2026-08-10T12:00:00Z')

  it('flags activity older than N days', () => {
    assert.equal(
      isStaleApplication('2026-07-01T12:00:00Z', 20, now),
      true,
    )
    assert.equal(
      isStaleApplication('2026-08-05T12:00:00Z', 20, now),
      false,
    )
  })

  it('only returns applied/interviewing ids', () => {
    const ids = findStaleApplicationIds(
      [
        { id: '1', status: 'applied', last_activity_at: '2026-07-01T00:00:00Z' },
        { id: '2', status: 'offer', last_activity_at: '2026-07-01T00:00:00Z' },
        { id: '3', status: 'interviewing', last_activity_at: '2026-08-09T00:00:00Z' },
      ],
      20,
      now,
    )
    assert.deepEqual(ids, ['1'])
  })
})
