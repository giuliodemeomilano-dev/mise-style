// Shared checks for the forms that collect an email address.
export function cleanEmail(v) {
  const e = String(v || '').trim().toLowerCase()
  if (e.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null
}

export function cleanLang(v) {
  return ['en', 'fr', 'es'].includes(v) ? v : 'en'
}

export function randomToken() {
  const a = new Uint8Array(18)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}
