async function digestHex(plain) {
  const data = new TextEncoder().encode(plain)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(plain) {
  return digestHex(plain)
}

export async function verifyPassword(plain, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false
  const h = await digestHex(plain)
  return h === storedHash
}
