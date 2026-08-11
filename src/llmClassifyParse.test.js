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

  it('accepts new_opportunity and forces opportunity status', () => {
    const r = normalizeLlmClassification({
      kind: 'new_opportunity',
      proposed_status: 'applied',
      company: 'CGI',
      awaiting_candidate_reply: true,
      job_title: 'Senior Software Engineer',
    })
    assert.equal(r.kind, 'new_opportunity')
    assert.equal(r.proposed_status, 'opportunity')
    assert.equal(r.proposed_company, 'CGI')
    assert.equal(r.proposed_role, 'Senior Software Engineer')
    assert.equal(r.awaiting_candidate_reply, true)
  })

  it('collapses screening to interviewing', () => {
    const r = normalizeLlmClassification({
      kind: 'status_update',
      proposed_status: 'screening',
      company: 'Acme',
    })
    assert.equal(r.proposed_status, 'interviewing')
  })

  it('needs_reply defaults proposed_status to opportunity', () => {
    const r = normalizeLlmClassification({
      kind: 'needs_reply',
      company: 'Beta',
    })
    assert.equal(r.proposed_status, 'opportunity')
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
