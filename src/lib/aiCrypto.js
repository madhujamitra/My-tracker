/**
 * AES-GCM encrypt/decrypt — mirror of supabase/functions/_shared/aiCrypto.js
 * for Node unit tests (Web Crypto).
 */

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

function b64ToBytes(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

async function importAesKey(secret) {
  if (!secret || String(secret).length < 16) {
    throw new Error('encryption secret missing or too short (min 16 chars)')
  }
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(String(secret)))
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptSecret(plaintext, secret) {
  const key = await importAesKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext),
    ),
  )
  const packed = new Uint8Array(iv.length + ct.length)
  packed.set(iv, 0)
  packed.set(ct, iv.length)
  return bytesToB64(packed)
}

export async function decryptSecret(ciphertextB64, secret) {
  const key = await importAesKey(secret)
  const packed = b64ToBytes(ciphertextB64)
  if (packed.length < 13) throw new Error('Invalid ciphertext')
  const iv = packed.slice(0, 12)
  const ct = packed.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

export function keyHint(apiKey) {
  const s = String(apiKey || '')
  if (s.length < 4) return '••••'
  return `••••${s.slice(-4)}`
}
