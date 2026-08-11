import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyJobEmail } from './lib/gmailClassify.js'
import {
  ALL_PIPELINE_FIXTURES,
  PIPELINE_EDGE_CASES,
  PIPELINE_TEST_CASES,
} from './lib/pipelineClassifyFixtures.js'
import { collapseStatusForPhaseA } from './lib/pipelineStatus.js'

function assertPhaseA(fixture) {
  const r = classifyJobEmail({
    subject: fixture.subject,
    snippet: fixture.snippet,
    from: fixture.from,
  })
  const e = fixture.phaseA
  assert.equal(r?.kind ?? null, e.kind, `${fixture.name}: kind`)
  assert.equal(
    r?.proposed_status ?? null,
    e.proposed_status,
    `${fixture.name}: proposed_status`,
  )
  assert.equal(
    r?.proposed_company ?? null,
    e.proposed_company,
    `${fixture.name}: proposed_company`,
  )
  if (e.awaiting_candidate_reply != null) {
    assert.equal(
      Boolean(r?.awaiting_candidate_reply),
      Boolean(e.awaiting_candidate_reply),
      `${fixture.name}: awaiting_candidate_reply`,
    )
  }
}

describe('pipeline fixtures (Phase A)', () => {
  it(`covers ${PIPELINE_TEST_CASES.length} core + ${PIPELINE_EDGE_CASES.length} edge cases`, () => {
    assert.equal(PIPELINE_TEST_CASES.length, 16)
    assert.equal(PIPELINE_EDGE_CASES.length, 4)
    assert.equal(ALL_PIPELINE_FIXTURES.length, 20)
  })

  for (const fixture of ALL_PIPELINE_FIXTURES) {
    it(fixture.name, () => {
      assertPhaseA(fixture)
    })
  }
})

describe('pipeline fixtures — ideal → Phase A collapse', () => {
  it('maps advanced ideal statuses into Phase A allowlist', () => {
    assert.equal(collapseStatusForPhaseA('screening'), 'interviewing')
    assert.equal(collapseStatusForPhaseA('assessment'), 'interviewing')
    assert.equal(collapseStatusForPhaseA('final_round'), 'interviewing')
    assert.equal(collapseStatusForPhaseA('accepted'), 'offer')
    assert.equal(collapseStatusForPhaseA('on_hold'), 'not_selected')
  })

  it('regression: CGI / RBC / Uber / HubSpot ideals stay coherent under Phase A', () => {
    const cgi = PIPELINE_TEST_CASES.find((c) => c.name.includes('CGI'))
    const rbc = PIPELINE_TEST_CASES.find((c) => c.name.includes('RBC'))
    const uber = PIPELINE_EDGE_CASES.find((c) => c.name.includes('Uber'))
    const hub = PIPELINE_EDGE_CASES.find((c) => c.name.includes('HubSpot'))
    assert.equal(cgi.phaseA.kind, 'new_application')
    assert.equal(rbc.phaseA.proposed_company, 'RBC')
    assert.equal(uber.phaseA.awaiting_candidate_reply, true)
    assert.equal(hub.phaseA.proposed_status, 'interviewing')
  })
})
