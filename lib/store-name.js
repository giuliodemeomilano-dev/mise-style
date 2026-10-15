// The merchant column holds whatever the daily task wrote: sometimes the brand
// ("Sandro"), sometimes the shop's domain ("cos.com"). On the site the visitor
// should always read the shop's name. Giulio, 2026-10-15: "Shop at Sandro" next
// to "Shop at cos.com" looked careless.
const MAP = {
  'cos.com': 'COS',
  'massimodutti.com': 'Massimo Dutti',
  'polene-paris.com': 'Polène',
  'polene': 'Polène',
  'polene paris': 'Polène',
  'sunspel.fr': 'Sunspel',
  'eu.sunspel.com': 'Sunspel',
  'sunspel.com': 'Sunspel',
  'castaner.com': 'Castañer',
  'castaner': 'Castañer',
  'hugoboss.com': 'Hugo Boss',
  'thefrankieshop.com': 'The Frankie Shop',
  'mejuri.com': 'Mejuri',
  'ancient-greek-sandals.com': 'Ancient Greek Sandals',
  'italist.com': 'Italist',
}

export function storeName(s) {
  if (!s) return ''
  const k = String(s).trim().toLowerCase().replace(/^www\./, '')
  return MAP[k] || String(s).trim()
}
