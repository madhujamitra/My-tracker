import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { keyHint } from './lib/aiCrypto.js'
import {
  aiStatusPublicFields,
  assertClientSafeObject,
  buildLlmMailPayload,
  hintIsSafe,
} from './lib/aiPrivacy.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('AI privacy — LLM mail payload', () => {
  it('sends only subject, snippet, from', () => {
    const payload = buildLlmMailPayload({
      subject: 'Offer',
      snippet: 'We are pleased…',
      from: 'hr@acme.com',
      body: 'FULL BODY WITH SSN',
      raw: 'MIME…',
      access_token: 'ya29.leak',
      refresh_token: '1//leak',
      apiKey: 'sk-should-not-appear',
    })
    assert.deepEqual(Object.keys(payload).sort(), ['from', 'snippet', 'subject'])
    assert.equal(payload.subject, 'Offer')
    assert.equal(payload.from, 'hr@acme.com')
    assert.equal(JSON.stringify(payload).includes('FULL BODY'), false)
    assert.equal(JSON.stringify(payload).includes('ya29'), false)
    assert.equal(JSON.stringify(payload).includes('sk-'), false)
  })
})

describe('AI privacy — key never in client responses', () => {
  it('status fields exclude ciphertext and apiKey', () => {
    const pub = aiStatusPublicFields({
      enabled: true,
      key_hint: '••••abcd',
      base_url: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      updated_at: '2026-01-01T00:00:00Z',
      ciphertext: 'BASE64_SECRET',
      apiKey: 'sk-leak',
    })
    assert.equal('ciphertext' in pub, false)
    assert.equal('apiKey' in pub, false)
    assertClientSafeObject(pub, 'ai-status')
    assert.equal(pub.key_hint, '••••abcd')
  })

  it('sync-style summary is client-safe', () => {
    assertClientSafeObject(
      {
        ok: true,
        scanned: 3,
        applications: 1,
        rejected: 0,
        offers: 0,
        interviews: 0,
        needs_reply: 0,
        skipped: 2,
        ai_enabled: true,
        ai_calls: 1,
        ai_hits: 1,
        ai_errors: 0,
      },
      'gmail-sync',
    )
  })

  it('rejects objects that embed an API key string', () => {
    assert.throws(() =>
      assertClientSafeObject({ message: 'sk-proj-abcdefghijklmnop' }, 'bad'),
    )
    assert.throws(() =>
      assertClientSafeObject({ ciphertext: 'x' }, 'bad'),
    )
  })

  it('key hint does not leak full key', () => {
    const key = 'sk-test-openai-key-abcdefghijklmnop'
    const hint = keyHint(key)
    assert.equal(hintIsSafe(key, hint), true)
    assert.equal(hint.includes(key), false)
  })
})

describe('AI privacy — schema RLS', () => {
  it('user_ai_settings has RLS and no authenticated select of ciphertext', () => {
    const sql = readFileSync(join(root, 'supabase/schema.sql'), 'utf8')
    assert.match(sql, /create table if not exists public\.user_ai_settings/)
    assert.match(
      sql,
      /alter table public\.user_ai_settings enable row level security/,
    )
    // No CREATE POLICY on this table → authenticated cannot read ciphertext
    const after = sql.slice(sql.indexOf('user_ai_settings'))
    const chunk = after.slice(0, 800)
    assert.equal(/create policy/i.test(chunk), false)
  })
})
