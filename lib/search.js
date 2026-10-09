import { GROUPS, COLOUR_LABEL, inSeason } from '@/lib/catalog'

const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const OCC = { office: 'office work', casual: 'casual', weekend: 'weekend', evening: 'evening party night', brunch: 'brunch', date: 'date night', travel: 'travel' }

function lookText(l) {
  const parts = [l.title, OCC[l.occasion] || l.occasion, l.season, l.gender === 'men' ? 'men mens man' : 'women womens woman']
  for (const p of l.pieces) {
    parts.push(p.name, p.brand, GROUPS[p.group]?.many, GROUPS[p.group]?.one, p.colour && COLOUR_LABEL[p.colour])
    if (p.group?.includes('boots')) parts.push('boots')
  }
  return fold(parts.filter(Boolean).join(' '))
}

// Filters: q (free text), g (women|men), colour, item (group), brand, max (price).
// Colour, item and brand must be true of the SAME piece when combined, so
// "black + boots" means black boots, not a black top with brown boots.
export function searchLooks(looks, f = {}) {
  const tokens = fold(f.q).split(/\s+/).filter((t) => t.length > 1)
  return looks.filter((l) => {
    if (!inSeason(l.season)) return false
    if (f.g && l.gender !== f.g) return false
    if (f.max && l.total > Number(f.max)) return false
    if (f.colour || f.item || f.brand) {
      const hit = l.pieces.some(
        (p) =>
          (!f.colour || p.colour === f.colour) &&
          (!f.item || p.group === f.item || (f.item === 'boots' && p.group?.includes('boots'))) &&
          (!f.brand || p.brand === f.brand)
      )
      if (!hit) return false
    }
    if (tokens.length) {
      const text = lookText(l)
      return tokens.every((t) => text.includes(t) || (t.endsWith('s') && text.includes(t.slice(0, -1))))
    }
    return true
  })
}

export function facets(looks) {
  const colours = {}
  const items = {}
  const brands = {}
  for (const l of looks) {
    if (!inSeason(l.season)) continue
    for (const p of l.pieces) {
      if (p.colour) colours[p.colour] = (colours[p.colour] || 0) + 1
      if (p.group && p.group !== 'accessories') items[p.group] = (items[p.group] || 0) + 1
      if (p.brand) brands[p.brand] = (brands[p.brand] || 0) + 1
    }
  }
  const sort = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k]) => k)
  return {
    colours: sort(colours).filter((k) => colours[k] >= 3).map((k) => ({ key: k, label: COLOUR_LABEL[k] })),
    items: sort(items).filter((k) => items[k] >= 3).map((k) => ({ key: k, label: GROUPS[k]?.many || k })),
    brands: sort(brands).filter((k) => brands[k] >= 3),
  }
}
