// Prices as the shops show them: whole euros stay whole (€130), anything with
// cents gets both digits (€376.60, never €376.6). Giulio, 2026-10-16.
export function eur(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '€' + (v ?? '')
  const r = Math.round(n * 100) / 100
  return '€' + (Number.isInteger(r) ? String(r) : r.toFixed(2))
}
