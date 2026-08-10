/**
 * AES-GCM encrypt/decrypt for BYOK API keys.
 * Format: base64( iv(12) || ciphertext )
 * Keep in sync with src/lib/aiCrypto.js (Node tests).
 */

function bytesToB64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToBytes(b64) {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function importAesKey(secret) {
  if (!secret || String(secret).length < 16) {
    throw new Error('AI_KEY_ENCRYPTION_SECRET missing or too short (min 16 chars)')
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

export function encryptionSecretFromEnv() {
  return (
    Deno.env.get('AI_KEY_ENCRYPTION_SECRET') ||
    Deno.env.get('GMAIL_OAUTH_STATE_SECRET') ||
    ''
  )
}

/** Decrypt a stored BYOK key using the Edge encryption secret. */
export async function decryptApiKey(ciphertextB64) {
  return decryptSecret(ciphertextB64, encryptionSecretFromEnv())
}
