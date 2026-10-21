import { GROUPS, COLOUR_LABEL, family, lookInSeason } from '@/lib/catalog'

// "Match your wardrobe": given one piece the visitor already owns (its group and
// colour, read from a photo), rank the MISE looks that contain the same kind of
// piece, so they can wear what they have and buy only what is missing.

export const MATCH_GROUPS = Object.keys(GROUPS).filter((g) => g !== 'accessories')
export const MATCH_COLOURS = Object.keys(COLOUR_LABEL)

// Colours that sit close enough that a look built around one still works with the other.
const NEAR = {
  ecru: ['white', 'beige'],
  white: ['ecru'],
  beige: ['ecru', 'camel'],
  camel: ['beige', 'brown'],
  brown: ['camel', 'burgundy'],
  black: ['grey'],
  grey: ['black'],
  navy: ['blue'],
  blue: ['navy'],
  burgundy: ['brown', 'red'],
  red: ['burgundy', 'rust'],
  rust: ['red', 'camel'],
  green: [],
  pink: [],
  yellow: [],
  purple: ['burgundy'],
  silver: ['grey'],
  gold: ['camel'],
}

function pieceScore(p, group, colour) {
  let s = 0
  if (group) {
    if (p.group === group) s += 6
    else if (family(group).includes(p.group)) s += 4
    else return 0
  }
  if (colour) {
    if (p.colour === colour) s += 4
    else if ((NEAR[colour] || []).includes(p.colour)) s += 2
    else if (group) s += 0.5
    else return 0
  }
  return s
}

export function matchLooks(looks, { group, colour, gender }, limit = 9) {
  const out = []
  for (const l of looks) {
    if (!lookInSeason(l)) continue
    if (gender && l.gender !== gender) continue
    let best = 0
    let bestId = null
    for (const p of l.pieces) {
      const s = pieceScore(p, group, colour)
      if (s > best) {
        best = s
        bestId = p.id
      }
    }
    if (best > 0) out.push({ look: l, score: best, owned: bestId })
  }
  out.sort((a, b) => b.score - a.score || String(b.look.created).localeCompare(String(a.look.created)))
  return out.slice(0, limit).map(({ look, owned }) => {
    const missing = look.pieces.filter((p) => p.id !== owned)
    return { ...look, owned, missingTotal: Math.round(missing.reduce((s, p) => s + p.price, 0)) }
  })
}
