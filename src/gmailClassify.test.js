import { classifyJobEmail, guessCompany, matchApplication } from './lib/gmailClassify.js'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canAdvanceStatus,
  collapseStatusForPhaseA,
  pickForwardStatus,
} from './lib/pipelineStatus.js'

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

  it('Vistera subject-only → opportunity (not applied)', () => {
    const r = classifyJobEmail({
      subject: 'Opportunities with IT/IQ Tech Recruiters - Vistera',
      snippet: '',
      from: "Eden O'Rourke <eden@itiq.com>",
    })
    assert.equal(r.kind, 'new_opportunity')
    assert.equal(r.proposed_status, 'opportunity')
    assert.equal(r.proposed_company, 'Vistera')
  })

  it('Vistera representation → applied', () => {
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
  })

  it('CGI interest outreach → opportunity not applied', () => {
    const r = classifyJobEmail({
      subject: 'Senior Software Engineer Opportunity at CGI',
      snippet:
        "I came across your profile and wanted to reach out regarding a Senior Software Engineer opportunity with CGI. If you're interested, I'd be happy to share more details.",
      from: 'Sarah <sarah@roberthalf.com>',
    })
    assert.equal(r.kind, 'new_opportunity')
    assert.equal(r.proposed_status, 'opportunity')
    assert.equal(r.proposed_company, 'CGI')
    assert.equal(r.awaiting_candidate_reply, true)
  })

  it('Altimetrik interest ask → opportunity', () => {
    const r = classifyJobEmail({
      subject: 'React Architect OR Lead || Mississauga',
      snippet:
        'Please review the JD and share an updated resume and availability if you are interested. Client: Altimetrik',
      from: 'Rajesh Kumar <rajesh@staffing.com>',
    })
    assert.equal(r.kind, 'new_opportunity')
    assert.equal(r.proposed_status, 'opportunity')
    assert.equal(r.proposed_company, 'Altimetrik')
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

  it('CGI-style application acknowledgement → applied', () => {
    const r = classifyJobEmail({
      subject:
        'Job Application Acknowledgement - Senior Full Stack Developer (Node.js / React / AWS), J0826-0345',
      snippet:
        'This message is confirming receipt of your resume for the job opportunity J0826-0345. CGI Recruitment Team.',
      from: 'CGI <help.candidate@njoyn.com>',
    })
    assert.equal(r.kind, 'new_application')
    assert.equal(r.proposed_status, 'applied')
    assert.equal(r.proposed_company, 'CGI')
  })

  it('UBC Workday soft rejection (move forward with other candidates) → rejected', () => {
    const r = classifyJobEmail({
      subject: 'Your application to the Position: Software Developer ( JR25262 )',
      snippet:
        'Dear Madhuja Thank you for your interest in the Software Developer role and for participating in the selection process. After careful consideration, the selection committee has decided to move forward with other candidates whose experience more closely aligns with the current needs of the role. We wish you every success in your ongoing job search. Sincerely, UBC Recruiting Team',
      from: 'UBC Notification <noreply@workday.svc.ubc.ca>',
    })
    assert.equal(r.kind, 'status_update')
    assert.equal(r.proposed_status, 'rejected')
  })

  it('soft reject: experience more closely aligns → rejected', () => {
    const r = classifyJobEmail({
      subject: 'Update on your application',
      snippet:
        'After careful review, we will move forward with other candidates whose experience more closely aligns with the role.',
      from: 'Careers <careers@example.com>',
    })
    assert.equal(r?.proposed_status, 'rejected')
  })

  it('positive move forward with you → not rejected', () => {
    const r = classifyJobEmail({
      subject: 'Next steps',
      snippet: "We're excited to move forward with you and schedule an interview.",
      from: 'Talent <talent@example.com>',
    })
    assert.notEqual(r?.proposed_status, 'rejected')
    assert.equal(r?.kind, 'interview_event')
  })

  it('UBC Workday soft rejection (Gmail short snippet only) → miss without body', () => {
    // Real Gmail snippet often stops at the polite opener. gmail-sync fetches a
    // body excerpt for application-update subjects so the soft-reject line is seen.
    const r = classifyJobEmail({
      subject: 'Your application to the Position: Software Developer ( JR25262 )',
      snippet:
        'Dear Madhuja Thank you for your interest in the Software Developer role and for participating in the selection process.',
      from: 'UBC Notification <noreply@workday.svc.ubc.ca>',
    })
    assert.equal(r, null)
  })

  it('matchApplication finds exact company', () => {
    const hit = matchApplication([{ id: 1, company: 'Vistera' }], 'Vistera')
    assert.equal(hit.id, 1)
  })
})

describe('pipelineStatus', () => {
  it('collapses Phase B stages', () => {
    assert.equal(collapseStatusForPhaseA('screening'), 'interviewing')
    assert.equal(collapseStatusForPhaseA('final_round'), 'interviewing')
  })

  it('does not move interviewing backward to opportunity', () => {
    assert.equal(canAdvanceStatus('interviewing', 'opportunity'), false)
    assert.equal(pickForwardStatus('interviewing', 'opportunity'), 'interviewing')
    assert.equal(pickForwardStatus('opportunity', 'applied'), 'applied')
  })
})
