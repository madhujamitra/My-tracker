import { classifyJobEmail, guessCompany, matchApplication } from './lib/gmailClassify.js'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('gmailClassify', () => {
  it('detects rejection', () => {
    const r = classifyJobEmail({
      subject: 'Update on your application',
      snippet: 'Unfortunately we will not be moving forward',
      from: 'Acme Careers <jobs@acme.com>',
    })
    assert.equal(r.kind, 'status_update')
    assert.equal(r.proposed_status, 'rejected')
    assert.equal(r.proposed_company, 'Acme')
  })

  it('detects interview', () => {
    const r = classifyJobEmail({
      subject: 'Phone screen with Globex',
      snippet: 'We would like to schedule an interview',
      from: 'recruiter@globex.com',
    })
    assert.equal(r.kind, 'interview_event')
  })

  it('detects application received', () => {
    const r = classifyJobEmail({
      subject: 'Thank you for applying',
      snippet: 'We have received your application',
      from: 'noreply@initech.io',
    })
    assert.equal(r.kind, 'new_application')
    assert.equal(r.proposed_status, 'applied')
  })

  it('guesses company from domain', () => {
    assert.equal(guessCompany({ from: 'hr@stripe.com', subject: 'Hi' }), 'Stripe')
  })

  it('detects needs reply', () => {
    const r = classifyJobEmail({
      subject: 'Quick question',
      snippet: 'Looking forward to hearing from you',
      from: 'recruiter@acme.com',
    })
    assert.equal(r.kind, 'needs_reply')
  })

  it('detects calendar invitation as interview', () => {
    const r = classifyJobEmail({
      subject: 'Invitation: Phone screen @ Tue',
      snippet: 'You have been invited',
      from: 'calendar-notification@google.com',
    })
    assert.equal(r.kind, 'interview_event')
  })
})
