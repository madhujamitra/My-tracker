import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decryptSecret, encryptSecret, keyHint } from './lib/aiCrypto.js'

describe('aiCrypto', () => {
  const secret = 'test-encryption-secret-32chars!!'

  it('round-trips plaintext', async () => {
    const plain = 'sk-test-openai-key-abcdefghijklmnop'
    const ct = await encryptSecret(plain, secret)
    assert.notEqual(ct, plain)
    const back = await decryptSecret(ct, secret)
    assert.equal(back, plain)
  })

  it('rejects short secret', async () => {
    await assert.rejects(() => encryptSecret('x', 'short'), /too short/)
  })

  it('builds key hint', () => {
    assert.equal(keyHint('sk-1234567890abcd'), '••••abcd')
  })
})
