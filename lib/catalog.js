// One place that reads the whole catalogue and gives every piece a clean brand,
// item type and colour. The database stores what the shops send us: categories
// like "boots", "ankle boots", "chelsea boots", brands as both "Castaner" and
// "Castañer", and almost no colours (1412 of 1527 products had none on
// 2026-10-09). The brand pages, the "how to style" pages, the search and the
// "same look for less" all need the cleaned version, so it lives here once.

import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'

// ---------- brands ----------

const BRAND_CANON = {
  castaner: 'Castañer',
  'castañer': 'Castañer',
  polene: 'Polène',
  'polène': 'Polène',
  boss: 'BOSS',
  'hugo boss': 'BOSS',
  cos: 'COS',
  arket: 'ARKET',
}

export function canonBrand(brand) {
  if (!brand) return ''
  const k = String(brand).trim().toLowerCase()
  return BRAND_CANON[k] || String(brand).trim()
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function brandSlug(brand) {
  return slugify(canonBrand(brand))
}

// ---------- item types ----------
// key: url fragment. one/many: singular and plural for titles.

export const GROUPS = {
  dresses: { one: 'Dress', many: 'Dresses' },
  skirts: { one: 'Skirt', many: 'Skirts' },
  jeans: { one: 'Jeans', many: 'Jeans' },
  trousers: { one: 'Trousers', many: 'Trousers' },
  chinos: { one: 'Chinos', many: 'Chinos' },
  shorts: { one: 'Shorts', many: 'Shorts' },
  knitwear: { one: 'Knit', many: 'Knitwear' },
  shirts: { one: 'Shirt', many: 'Shirts' },
  't-shirts': { one: 'T-Shirt', many: 'T-Shirts' },
  polos: { one: 'Polo', many: 'Polos' },
  tops: { one: 'Top', many: 'Tops' },
  coats: { one: 'Coat', many: 'Coats' },
  jackets: { one: 'Jacket', many: 'Jackets' },
  loafers: { one: 'Loafers', many: 'Loafers' },
  'ankle-boots': { one: 'Ankle Boots', many: 'Ankle Boots' },
  'knee-boots': { one: 'Knee Boots', many: 'Knee Boots' },
  boots: { one: 'Boots', many: 'Boots' },
  sneakers: { one: 'Sneakers', many: 'Sneakers' },
  heels: { one: 'Heels', many: 'Heels' },
  'ballet-flats': { one: 'Ballet Flats', many: 'Ballet Flats' },
  'derby-shoes': { one: 'Derby Shoes', many: 'Derby Shoes' },
  sandals: { one: 'Sandals', many: 'Sandals' },
  espadrilles: { one: 'Espadrilles', many: 'Espadrilles' },
  mules: { one: 'Mules', many: 'Mules' },
  'boat-shoes': { one: 'Boat Shoes', many: 'Boat Shoes' },
  bags: { one: 'Bag', many: 'Bags' },
  earrings: { one: 'Earrings', many: 'Earrings' },
  necklaces: { one: 'Necklace', many: 'Necklaces' },
  bracelets: { one: 'Bracelet', many: 'Bracelets' },
  rings: { one: 'Ring', many: 'Rings' },
  accessories: { one: 'Accessory', many: 'Accessories' },
}

// Which groups can stand in for each other when a piece is sold out or when we
// look for a cheaper version. A sold-out knee boot is better replaced by an ankle
// boot than by nothing.
const FAMILY = {
  'ankle-boots': ['ankle-boots', 'boots'],
  boots: ['boots', 'ankle-boots', 'knee-boots'],
  'knee-boots': ['knee-boots', 'boots'],
  heels: ['heels'],
  'ballet-flats': ['ballet-flats', 'loafers'],
  trousers: ['trousers', 'chinos'],
  chinos: ['chinos', 'trousers'],
  tops: ['tops', 'knitwear', 't-shirts'],
  knitwear: ['knitwear', 'tops'],
  't-shirts': ['t-shirts', 'tops'],
}

export function family(group) {
  return FAMILY[group] || [group]
}

export function itemGroup(category, name) {
  const c = String(category || '').toLowerCase().trim()
  const n = String(name || '').toLowerCase()
  const has = (re) => re.test(n)

  if (/^dress/.test(c)) return 'dresses'
  if (/^skirt/.test(c)) return 'skirts'
  if (c === 'jeans') return 'jeans'
  if (c === 'chinos') return 'chinos'
  if (c === 'shorts') return 'shorts'
  if (['trousers', 'pants', 'leggings', 'bottom', 'bottoms'].includes(c)) {
    if (has(/\bjeans?\b|denim/)) return 'jeans'
    if (has(/\bshorts?\b|bermuda/)) return 'shorts'
    if (has(/\bskirt/)) return 'skirts'
    if (has(/\bchino/)) return 'chinos'
    return 'trousers'
  }
  if (['knitwear', 'jumper', 'knit top', 'roll neck', 'sweater', 'cardigan'].includes(c)) return 'knitwear'
  if (c === 'knit polo' || c === 'polo') return 'polos'
  if (['shirt', 'shirts', 'blouse', 'blouses'].includes(c)) return 'shirts'
  if (['t-shirt', 'tank', 'tank top', 'henley'].includes(c)) return 't-shirts'
  if (['top', 'tops', 'bodysuit'].includes(c)) {
    if (has(/knit|merino|cashmere|wool|jumper|sweater|cardigan|rib/)) return 'knitwear'
    if (has(/shirt|blouse/) && !has(/t-shirt|tee/)) return 'shirts'
    return 'tops'
  }
  if (c === 'coat' || has(/\bcoat\b|trench|parka/)) return 'coats'
  if (['jacket', 'outerwear', 'blazer'].includes(c)) return 'jackets'

  if (['loafers', 'moccasins', 'heeled loafers'].includes(c)) return 'loafers'
  if (['knee boots'].includes(c) || (c === 'boots' && has(/knee|riding|over-the-knee|tall/))) return 'knee-boots'
  if (['ankle boots', 'chelsea boots', 'chukka boots', 'desert boots'].includes(c)) return 'ankle-boots'
  if (c === 'boots') return has(/ankle|chelsea|chukka|desert|bootie/) ? 'ankle-boots' : 'boots'
  if (['sneakers', 'trainers'].includes(c)) return 'sneakers'
  if (['heels', 'pumps', 'slingback', 'slingbacks'].includes(c)) return 'heels'
  if (['ballet flats', 'ballerinas', 'flats'].includes(c)) return 'ballet-flats'
  if (['derby shoes', 'derbies', 'oxfords', 'oxford shoes'].includes(c)) return 'derby-shoes'
  if (['sandals', 'heeled sandals', 'wedges', 'slippers'].includes(c)) return 'sandals'
  if (c === 'espadrilles') return 'espadrilles'
  if (c === 'mules') return 'mules'
  if (c === 'boat shoes') return 'boat-shoes'
  if (c === 'shoes') {
    if (has(/loafer|moccasin/)) return 'loafers'
    if (has(/espadrille/)) return 'espadrilles'
    if (has(/sandal/)) return 'sandals'
    if (has(/sneaker|trainer/)) return 'sneakers'
    if (has(/ballet|ballerina/)) return 'ballet-flats'
    if (has(/mule/)) return 'mules'
    if (has(/derby|oxford|brogue/)) return 'derby-shoes'
    if (has(/boot/)) return has(/knee|riding/) ? 'knee-boots' : 'ankle-boots'
    if (has(/heel|pump|slingback/)) return 'heels'
    if (has(/boat/)) return 'boat-shoes'
    return 'sneakers'
  }
  if (['bag', 'bags'].includes(c)) return 'bags'
  if (c === 'earrings') return 'earrings'
  if (c === 'necklace') return 'necklaces'
  if (['bracelet', 'bangle', 'cuff'].includes(c)) return 'bracelets'
  if (c === 'ring') return 'rings'
  if (c === 'jewelry') {
    if (has(/earring|hoop|stud/)) return 'earrings'
    if (has(/necklace|chain|pendant/)) return 'necklaces'
    if (has(/bracelet|bangle|cuff/)) return 'bracelets'
    if (has(/\bring\b/)) return 'rings'
    return 'accessories'
  }
  return 'accessories'
}

// ---------- colours ----------
// Read from the colour field when the shop sent one, otherwise from the name.
// Order matters: "off-white" must be ecru before "white" can match it.

const COLOURS = [
  ['ecru', 'Ecru', /off[- ]?white|\becru\b|écru|ivory|cream|\bcrema\b|natural|\boat\b|bone|bianco roto|open white/],
  ['black', 'Black', /\bblack\b|\bnoir\b|\bnegro\b|\bnero\b/],
  ['white', 'White', /\bwhite\b|\bblanc\b|\bbianco\b|\bblanco\b/],
  ['navy', 'Navy', /\bnavy\b|dark blue|blu scuro|midnight|\bmarine\b/],
  ['burgundy', 'Burgundy', /burgundy|bordeaux|\bwine\b|cherry|oxblood|grenat|dark red/],
  ['camel', 'Camel', /\bcamel\b|\btan\b|cognac|caramel/],
  ['brown', 'Brown', /brown|chocolate|\bcaf[eé]\b|marrone|coffee|chestnut|espresso|mocha|ebony|tobacco|castano|\bdark brown\b/],
  ['beige', 'Beige', /beige|\bsand\b|stone|taupe|\btopo\b|greige/],
  ['grey', 'Grey', /\bgr[ae]y\b|charcoal|anthracite|grigio|carbon|heather/],
  ['blue', 'Blue', /\bblue\b|indigo|denim|celeste|cobalt|\bazul\b|\bblu\b/],
  ['green', 'Green', /green|olive|khaki|\bsage\b|loden|forest|\bmoss\b|algue|\bmint\b/],
  ['red', 'Red', /\bred\b|\brouge\b|\brosso\b|scarlet/],
  ['pink', 'Pink', /\bpink\b|\brose\b|blush/],
  ['yellow', 'Yellow', /yellow|butter|lemon/],
  ['rust', 'Rust', /\brust\b|terracotta|orange/],
  ['purple', 'Purple', /purple|\bplum\b|lilac|violet/],
  ['silver', 'Silver', /silver|argent/],
  ['gold', 'Gold', /\bgold\b|\bdor[ée]\b/],
]

export const COLOUR_LABEL = Object.fromEntries(COLOURS.map(([k, label]) => [k, label]))

export function colourOf(colorField, name) {
  const tryText = (t) => {
    const s = String(t || '').toLowerCase()
    if (!s) return null
    for (const [k, , re] of COLOURS) if (re.test(s)) return k
    return null
  }
  return tryText(colorField) || tryText(name)
}

// ---------- seasons ----------
// Giulio, 2026-10-04: nothing summery out of season. Rather than a list to keep
// up to date by hand, a look is hidden from the new pages when its season is the
// opposite of today's. Looks with no season count as all-year.

export function seasonNow(d = new Date()) {
  const m = d.getUTCMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

const OPPOSITE = { autumn: ['summer'], winter: ['summer'], spring: ['winter'], summer: ['winter', 'autumn'] }

export function inSeason(season, d = new Date()) {
  if (!season) return true
  return !(OPPOSITE[seasonNow(d)] || []).includes(String(season).toLowerCase())
}

// ---------- reading ----------

function shapePiece(p, item) {
  if (!p) return null
  return {
    id: p.id,
    external_id: p.external_id,
    name: p.name,
    brand: canonBrand(p.brand),
    store: p.merchant,
    price: Number(p.price) || 0,
    category: p.category,
    group: itemGroup(p.category, p.name),
    colour: colourOf(p.color, p.name),
    gender: p.gender,
    inStock: p.in_stock !== false,
    packshot: p.cutout_url || p.packshot_url || p.image_url,
    cut: Boolean(p.cutout_url),
    box: p.cutout_box || null,
    role: item ? item.role : null,
  }
}

const PRODUCT_FIELDS =
  'id, external_id, name, brand, merchant, price, category, color, gender, in_stock, image_url, packshot_url, cutout_url, cutout_box'

// Every active look with its pieces, newest first. Cached for an hour and shared
// by every page that needs it, so building 150 style pages is one query, not 150.
async function readLooks() {
  const { data, error } = await supabase
    .from('outfits')
    .select(
      'id, slug, title, mood, occasion, season, gender, total_price, featured_score, created_at, model_image_url, model_box, hero_image_url, outfit_items (position, role, products (' +
        PRODUCT_FIELDS +
        '))'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((o) => {
    const items = [...(o.outfit_items || [])].sort((a, b) => a.position - b.position)
    const pieces = items.map((it) => shapePiece(it.products, it)).filter(Boolean)
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      occasion: o.occasion,
      season: o.season,
      gender: o.gender,
      total: Number(o.total_price) || pieces.reduce((s, p) => s + p.price, 0),
      featured: o.featured_score,
      created: o.created_at,
      model: o.model_image_url,
      modelBox: o.model_box,
      hero: o.hero_image_url,
      pieces,
    }
  })
}

export const getLooks = unstable_cache(readLooks, ['mise-looks-v1'], { revalidate: 3600 })

// Every product, in pages: Supabase returns at most 1000 rows per request.
async function readProducts() {
  const out = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_FIELDS)
      .range(from, from + 999)
    if (error || !data) break
    out.push(...data.map((p) => shapePiece(p)))
    if (data.length < 1000) break
  }
  return out
}

export const getProducts = unstable_cache(readProducts, ['mise-products-v1'], { revalidate: 3600 })

// ---------- alternatives ----------
// A replacement for one piece: same gender, same family of item, in stock, the
// closest colour we can find, and the closest price (or the cheapest, for the
// "for less" version). Never a piece already in the look.

function colourScore(a, b) {
  if (!a || !b) return 1
  if (a === b) return 0
  const close = [
    ['ecru', 'white', 'beige'],
    ['brown', 'camel', 'beige'],
    ['navy', 'blue', 'black'],
    ['black', 'grey', 'navy'],
    ['burgundy', 'red', 'brown'],
    ['green', 'beige', 'brown'],
  ]
  return close.some((g) => g.includes(a) && g.includes(b)) ? 1 : 3
}

// Words that make a piece summery. Out of season (autumn and winter) such a piece
// is never offered as a replacement: on 2026-10-09 the first test swapped an
// autumn knit maxi for a linen mini.
const SUMMERY = /linen|\blino\b|riviera|swim|bikini|espadrille|sandal|shorts?\b|bermuda|raffia|straw|crochet|open[- ]back|sleeveless|tank|cami\b/i
const LENGTHS = ['maxi', 'midi', 'mini', 'short', 'long']
const STOP = new Set(['with', 'and', 'the', 'in', 'of', 'for', 'black', 'white', 'navy', 'brown', 'grey', 'gray', 'blue', 'green', 'cream', 'beige'])

function words(name) {
  return new Set(
    String(name || '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
  )
}

function likeness(a, b) {
  const wa = words(a.name)
  const wb = words(b.name)
  let shared = 0
  wa.forEach((w) => wb.has(w) && shared++)
  const la = LENGTHS.find((l) => wa.has(l) || String(a.name).toLowerCase().includes(l + ' '))
  const lb = LENGTHS.find((l) => wb.has(l) || String(b.name).toLowerCase().includes(l + ' '))
  const lengthClash = la && lb && la !== lb ? 1 : 0
  return { shared, lengthClash }
}

export function findAlternative(piece, products, { exclude = [], cheaper = false, gender } = {}) {
  const fam = family(piece.group)
  const cold = ['autumn', 'winter'].includes(seasonNow())
  const pool = products.filter(
    (p) =>
      p.id !== piece.id &&
      !exclude.includes(p.id) &&
      p.inStock &&
      p.price > 0 &&
      p.packshot &&
      fam.includes(p.group) &&
      (!gender || !p.gender || p.gender === gender || p.gender === 'unisex') &&
      (!cold || !SUMMERY.test(p.name) || SUMMERY.test(piece.name)) &&
      // For the cheaper version the colour must be known on both sides and match,
      // otherwise "same look for less" is a different look.
      (!cheaper || (p.price <= piece.price * 0.8 && piece.colour && p.colour && colourScore(piece.colour, p.colour) <= 1))
  )
  if (!pool.length) return null
  const score = (p) => {
    const { shared, lengthClash } = likeness(piece, p)
    return (
      colourScore(piece.colour, p.colour) * 100 +
      (p.group === piece.group ? 0 : 60) +
      lengthClash * 120 -
      shared * 30 +
      (cheaper ? p.price / 10 : Math.abs(p.price - piece.price) / 10)
    )
  }
  const best = pool.sort((a, b) => score(a) - score(b))[0]
  // A cheaper piece with a different length (a mini for a maxi) is not the same look.
  if (cheaper && likeness(piece, best).lengthClash) return null
  return best
}

// The cheaper version of a whole look. Only pieces where we found something at
// least 20% cheaper are swapped; the rest stay. Returns null when the saving is
// too small to be worth a button.
export function lookForLess(look, products) {
  const used = look.pieces.map((p) => p.id)
  let swapped = 0
  const pieces = look.pieces.map((p) => {
    const alt = findAlternative(p, products, { exclude: used, cheaper: true, gender: look.gender })
    if (!alt || colourScore(p.colour, alt.colour) > 1) return { ...p, kept: true }
    used.push(alt.id)
    swapped++
    return { ...alt, replaces: p.id }
  })
  const original = look.pieces.reduce((s, p) => s + p.price, 0)
  const total = pieces.reduce((s, p) => s + p.price, 0)
  const saving = original - total
  if (!swapped || saving < 60 || saving / original < 0.15) return null
  return { pieces, total: Math.round(total), saving: Math.round(saving) }
}

// ---------- style and brand pages ----------
// A "how to style" page exists for an item type (and an item type in a colour)
// when at least MIN in-season looks use it, so no page is ever thin or empty.

export const MIN_LOOKS = 3

function genderWord(g) {
  return g === 'men' ? 'men' : 'women'
}

export function styleSlug({ group, colour, gender }) {
  return [colour, group, genderWord(gender)].filter(Boolean).join('-')
}

export function styleTitle({ group, colour, gender }) {
  const g = GROUPS[group] || { many: group }
  const item = (colour ? COLOUR_LABEL[colour] + ' ' : '') + g.many
  return 'How to Style ' + item + (gender === 'men' ? ' for Men' : ' for Women')
}

export function buildStylePages(looks) {
  const map = new Map()
  const add = (key, look, piece) => {
    if (!map.has(key.slug)) map.set(key.slug, { ...key, looks: [], pieces: [] })
    const e = map.get(key.slug)
    if (!e.looks.some((l) => l.id === look.id)) e.looks.push(look)
    if (!e.pieces.some((p) => p.id === piece.id)) e.pieces.push(piece)
  }
  for (const look of looks) {
    if (!inSeason(look.season)) continue
    for (const p of look.pieces) {
      if (!p.group || p.group === 'accessories') continue
      const base = { group: p.group, gender: look.gender }
      add({ ...base, slug: styleSlug(base) }, look, p)
      if (p.colour) {
        const withColour = { ...base, colour: p.colour }
        add({ ...withColour, slug: styleSlug(withColour) }, look, p)
      }
    }
  }
  return [...map.values()]
    .filter((e) => e.looks.length >= MIN_LOOKS)
    .map((e) => ({ ...e, title: styleTitle(e) }))
}

export function buildBrandPages(looks) {
  const map = new Map()
  for (const look of looks) {
    if (!inSeason(look.season)) continue
    for (const p of look.pieces) {
      if (!p.brand) continue
      const slug = brandSlug(p.brand)
      if (!map.has(slug)) map.set(slug, { slug, brand: p.brand, looks: [], pieces: [] })
      const e = map.get(slug)
      if (!e.looks.some((l) => l.id === look.id)) e.looks.push(look)
      if (!e.pieces.some((x) => x.id === p.id)) e.pieces.push(p)
    }
  }
  return [...map.values()].filter((e) => e.looks.length >= MIN_LOOKS)
}
