import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractGmailUrlFromNotes, gmailOpenUrl } from './lib/gmailLinks.js'

describe('gmailLinks', () => {
  it('builds open URL', () => {
    assert.equal(
      gmailOpenUrl('thread123'),
      'https://mail.google.com/mail/u/0/#all/thread123',
    )
  })

  it('extracts URL from notes', () => {
    const notes = [
      'From Gmail',
      'Subject: Invitation: Blend interview',
      'https://mail.google.com/mail/u/0/#all/abc123',
      'Preview: You have an invitation',
    ].join('\n')
    assert.equal(
      extractGmailUrlFromNotes(notes),
      'https://mail.google.com/mail/u/0/#all/abc123',
    )
  })
})
