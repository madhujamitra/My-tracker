import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeLlmClassification,
  parseLlmClassificationContent,
} from './lib/llmClassifyParse.js'

describe('normalizeLlmClassification', () => {
  it('accepts offer status_update', () => {
    const r = normalizeLlmClassification({
      kind: 'status_update',
      proposed_status: 'offer',
      company: 'Acme',
      title: 'Offer letter',
    })
    assert.equal(r.kind, 'status_update')
    assert.equal(r.proposed_status, 'offer')
    assert.equal(r.proposed_company, 'Acme')
    assert.equal(r.source, 'llm')
  })

  it('rejects ignore and unknown kinds', () => {
    assert.equal(normalizeLlmClassification({ kind: 'ignore' }), null)
    assert.equal(normalizeLlmClassification({ kind: 'spam' }), null)
  })

  it('defaults status_update without status to rejected', () => {
    const r = normalizeLlmClassification({ kind: 'status_update', company: 'X' })
    assert.equal(r.proposed_status, 'rejected')
  })

  it('drops invalid status then defaults', () => {
    const r = normalizeLlmClassification({
      kind: 'status_update',
      proposed_status: 'hired',
      company: 'X',
    })
    assert.equal(r.proposed_status, 'rejected')
  })
})

describe('parseLlmClassificationContent', () => {
  it('parses JSON string', () => {
    const r = parseLlmClassificationContent(
      '{"kind":"needs_reply","company":"Beta"}',
      { subject: 'Re: next steps' },
    )
    assert.equal(r.kind, 'needs_reply')
    assert.equal(r.proposed_company, 'Beta')
    assert.equal(r.proposed_title, 'Re: next steps')
  })

  it('returns null on bad JSON', () => {
    assert.equal(parseLlmClassificationContent('not-json'), null)
  })
})
