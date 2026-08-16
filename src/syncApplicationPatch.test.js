import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeApplicationSyncPatch,
  isUserStatusLocked,
} from './lib/syncApplicationPatch.js'

describe('syncApplicationPatch', () => {
  const base = {
    id: '1',
    company: 'Liftoff',
    status: 'applied',
    status_source: 'sync',
    applied_at: '2026-08-11',
    role: null,
    notes: 'From Gmail\nSubject: hi',
  }

  it('does not change status when user-locked', () => {
    const matched = { ...base, status: 'opportunity', status_source: 'user' }
    const patch = computeApplicationSyncPatch(matched, {
      status: 'interviewing',
      notes: 'From Gmail\nSubject: interview\nhttps://mail.google.com/mail/u/0/#all/abc',
      now: '2026-08-15T00:00:00.000Z',
    })
    assert.ok(patch)
    assert.equal(patch.status, undefined)
    assert.match(patch.notes, /mail\.google\.com/)
  })

  it('advances unlocked status forward', () => {
    const patch = computeApplicationSyncPatch(base, {
      status: 'interviewing',
      now: '2026-08-15T00:00:00.000Z',
    })
    assert.equal(patch.status, 'interviewing')
  })

  it('does not overwrite user notes', () => {
    const matched = { ...base, notes: 'My personal note' }
    const patch = computeApplicationSyncPatch(matched, {
      status: 'applied',
      notes: 'From Gmail\nSubject: x',
      now: '2026-08-15T00:00:00.000Z',
    })
    assert.equal(patch, null)
  })

  it('no-op when nothing to change (re-sync idempotent)', () => {
    const matched = {
      ...base,
      notes: 'From Gmail\nSubject: x\nhttps://mail.google.com/mail/u/0/#all/1',
      role: 'Engineer',
    }
    const patch = computeApplicationSyncPatch(matched, {
      status: 'applied',
      notes: matched.notes,
      role: 'Engineer',
      appliedAt: '2026-08-11',
      now: '2026-08-15T00:00:00.000Z',
    })
    assert.equal(patch, null)
  })

  it('isUserStatusLocked', () => {
    assert.equal(isUserStatusLocked({ status_source: 'user' }), true)
    assert.equal(isUserStatusLocked({ status_source: 'sync' }), false)
  })
})
