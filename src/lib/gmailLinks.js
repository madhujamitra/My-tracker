/** Open a Gmail message/thread in the web UI. */
export function gmailOpenUrl(threadOrMessageId) {
  if (!threadOrMessageId) return null
  return `https://mail.google.com/mail/u/0/#all/${threadOrMessageId}`
}

/** First mail.google.com URL embedded in notes text, if any. */
export function extractGmailUrlFromNotes(notes) {
  const text = String(notes || '')
  const m = text.match(/https:\/\/mail\.google\.com\/mail\/[^\s]+/i)
  return m ? m[0] : null
}
