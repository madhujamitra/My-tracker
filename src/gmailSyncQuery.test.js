import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const syncSrc = readFileSync(
  join(root, 'supabase/functions/gmail-sync/index.ts'),
  'utf8',
)

/** Extract the Gmail list `q` string from gmail-sync (keeps test honest to deploy code). */
function extractGmailListQuery() {
  const m = syncSrc.match(/const q =\s*([\s\S]*?)const listUrl/)
  assert.ok(m, 'gmail-sync q assignment not found')
  // Evaluate the concatenated string expression safely by stripping to string literals
  const expr = m[1].trim().replace(/;$/, '')
  // eslint-disable-next-line no-new-func
  const q = Function(`"use strict"; return (${expr})`)()
  assert.equal(typeof q, 'string')
  return q
}

describe('gmail-sync list query', () => {
  it('searches body terms so Cover Genius interview threads are not missed', () => {
    const q = extractGmailListQuery()
    assert.match(q, /newer_than:7d/)
    // Subject-only interview would miss "Cover Genius: Senior Software Engineer…"
    assert.match(q, /interview process/)
    assert.match(q, /schedule a/)
    assert.match(q, /scheduling link/)
    assert.match(q, /next stage/)
    assert.match(q, /booked our call/)
  })
})
