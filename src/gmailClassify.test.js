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

  it('detects offer', () => {
    const r = classifyJobEmail({
      subject: 'Your offer from Initech',
      snippet: 'We are pleased to offer you the role',
      from: 'hr@initech.com',
    })
    assert.equal(r.kind, 'status_update')
    assert.equal(r.proposed_status, 'offer')
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

  it('Vistera recruiter pipeline → applied with employer', () => {
    const r = classifyJobEmail({
      subject: 'Opportunities with IT/IQ Tech Recruiters - Vistera',
      snippet:
        'IT/IQ would like to represent you for the Senior Full Stack Developer opportunity with Vistera',
      from: "Eden O'Rourke <eden@itiq.com>",
    })
    assert.equal(r.kind, 'new_application')
    assert.equal(r.proposed_status, 'applied')
    assert.equal(r.proposed_company, 'Vistera')
  })

  it('Mosaic recruiter pipeline → applied', () => {
    const r = classifyJobEmail({
      subject: 'Madhuja, interested in a new opportunity?',
      snippet:
        'Thank you for sending over your resume. I will review it and share it with the Mosaic team.',
      from: 'Atie Sayadi <atie@forecareer.com>',
    })
    assert.equal(r.kind, 'new_application')
    assert.equal(r.proposed_company, 'Mosaic')
    assert.equal(r.awaiting_candidate_reply, false)
  })

  it('Altimetrik waiting on candidate → applied + awaiting reply', () => {
    const r = classifyJobEmail({
      subject: 'React Architect OR Lead || Mississauga',
      snippet:
        'Please review the JD and share an updated resume and availability if you are interested. Client: Altimetrik',
      from: 'Rajesh Kumar <rajesh@staffing.com>',
    })
    assert.equal(r.kind, 'new_application')
    assert.equal(r.proposed_company, 'Altimetrik')
    assert.equal(r.awaiting_candidate_reply, true)
  })

  it('Cover Genius screening invite → interview_event', () => {
    const r = classifyJobEmail({
      subject:
        'Invitation from an unknown sender: Madhuja Mitra and Hairanica Gonzalez @ Tue Aug 4, 2026 5:30pm - 6pm (GMT-7)',
      snippet: 'Initial Screening - 30 Minute Meeting. Join with Google Meet',
      from: 'Hairanica Gonzalez <hairanica.g@covergenius.com>',
    })
    assert.equal(r.kind, 'interview_event')
    assert.equal(r.proposed_company, 'Covergenius')
  })

  it('matchApplication finds exact company', () => {
    const hit = matchApplication(
      [{ id: 1, company: 'Vistera' }],
      'Vistera',
    )
    assert.equal(hit.id, 1)
  })
})
