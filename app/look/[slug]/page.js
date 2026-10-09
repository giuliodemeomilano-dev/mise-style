import { supabase } from '@/lib/supabase'
import PiecesGrid from './PiecesGrid'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import {
  getLooks,
  getProducts,
  itemGroup,
  colourOf,
  canonBrand,
  brandSlug,
  findAlternative,
  lookForLess,
  buildStylePages,
  buildBrandPages,
  GROUPS,
  COLOUR_LABEL,
} from '@/lib/catalog'
import SaveButton from '@/app/components/SaveButton'
import EmailSignup from '@/app/components/EmailSignup'
import PieceTile from '@/app/components/PieceTile'

export const revalidate = 3600

const OCCASION_LABEL = {
  office: 'Office',
  casual: 'Casual',
  weekend: 'Weekend',
  evening: 'Evening',
  brunch: 'Brunch',
  date: 'Date Night',
  travel: 'Travel',
}

const SEASON_LABEL = {
  summer: 'Summer',
  spring: 'Spring',
  autumn: 'Autumn',
  winter: 'Winter',
}

// Builds a search-friendly label like "Men's Summer Office Outfit".
// The editorial title stays as the visible headline; this is what people
// actually type into Google.
function seoLabel(outfit) {
  const who =
    outfit.gender === 'men' ? "Men's" : outfit.gender === 'women' ? "Women's" : ''
  const season = SEASON_LABEL[outfit.season] || ''
  const occasion = OCCASION_LABEL[outfit.occasion] || ''
  return [who, season, occasion, 'Outfit'].filter(Boolean).join(' ')
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data: outfit } = await supabase
    .from('outfits')
    .select('title, description, hero_image_url, model_image_url, total_price, occasion, season, gender')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!outfit) {
    return { title: 'Look not found — MISE' }
  }

  const seo = seoLabel(outfit)

  return {
    title: seo + ': ' + outfit.title + ' | MISE',
    description:
      'Shop this ' + seo.toLowerCase() + ' — ' + outfit.title + '. €' + outfit.total_price + ' across multiple stores, every piece shoppable. Curated by MISE.',
    openGraph: {
      title: seo + ': ' + outfit.title + ' | MISE',
      description: outfit.description,
      images: [outfit.model_image_url || outfit.hero_image_url],
    },
  }
}

async function getOutfit(slug) {
  const { data: outfit, error } = await supabase
    .from('outfits')
    .select('id, slug, title, description, mood, occasion, season, gender, budget_tier, tags, hero_image_url, model_image_url, model_box, total_price, outfit_items (position, role, products (id, external_id, category, name, brand, merchant, price, color, in_stock, image_url, packshot_url, cutout_url, cutout_box, affiliate_url))')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !outfit) return null

  // The reel lives in its own column, added on 2026-10-09. Read apart so a look
  // still opens if the column is ever missing.
  let reel = null
  try {
    const { data: r } = await supabase.from('outfits').select('reel_url').eq('id', outfit.id).single()
    reel = r?.reel_url || null
  } catch (e) {}

  const sortedItems = [...(outfit.outfit_items || [])].sort((a, b) => a.position - b.position)

  return {
    ...outfit,
    reel,
    pieces: sortedItems.map((item) => ({
      in_stock: item.products?.in_stock,
      color: item.products?.color,
      id: item.products?.id,
      external_id: item.products?.external_id,
      category: item.products?.category,
      name: item.products?.name,
      brand: item.products?.brand,
      store: item.products?.merchant,
      price: item.products?.price,
      img: item.products?.image_url,
      // Prefer the background-removed version when the daily task has made one.
      packshot: item.products?.cutout_url || item.products?.packshot_url || item.products?.image_url,
      // The measured alpha box, so the pieces grid can place the GARMENT in the cell
      // instead of centring the file and letting the brand’s empty margin decide.
      box: item.products?.cutout_box,
      url: item.products?.affiliate_url,
    })),
  }
}


// Same maths as the homepage card: the cut-out keeps its original canvas, so without
// the measured box every figure lands at a different size. "ar,top,bottom,left,right".
// cellAr is the box's OWN width/height. Percentage width resolves against the box
// width and percentage top against its height, so without it the vertical maths is
// off by exactly the cell ratio. The homepage cells are square and hid the bug; this
// panel is 2:3 and the figure came out 50% too tall, head cut off.
function cutFit(box, fill, cellAr = 1) {
  if (!box) return undefined
  const p = String(box).split(',').map(Number)
  if (p.length !== 5 || p.some((n) => !Number.isFinite(n))) return undefined
  const [ar, top, bottom, left, right] = p
  const cw = right - left
  const ch = bottom - top
  if (!(ar > 0 && cw > 0 && ch > 0)) return undefined
  const w = Math.min(fill / cw, (fill * ar) / (ch * cellAr))
  const h = (w * cellAr) / ar
  return {
    position: 'absolute',
    width: `${(w * 100).toFixed(3)}%`,
    height: 'auto',
    transform: 'none',
    left: `${((0.5 - ((left + right) / 2) * w) * 100).toFixed(3)}%`,
    top: `${((0.5 - ((top + bottom) / 2) * h) * 100).toFixed(3)}%`,
  }
}

export default async function LookPage({ params }) {
  const { slug } = await params
  const look = await getOutfit(slug)

  if (!look) notFound()

  // Sold-out pieces get a similar one in stock; every piece gets its style guide
  // link when that page exists; and the whole look gets a cheaper version when
  // we can find one. All from the cached catalogue, nothing extra per visit.
  let extras = {}
  let forLess = null
  try {
    const [products, allLooks] = await Promise.all([getProducts(), getLooks()])
    const stylePages = new Map(buildStylePages(allLooks).map((s) => [s.slug, s]))
    const brandPages = new Set(buildBrandPages(allLooks).map((b) => b.slug))
    const shaped = look.pieces.map((p) => ({
      ...p,
      brand: canonBrand(p.brand),
      price: Number(p.price) || 0,
      group: itemGroup(p.category, p.name),
      colour: colourOf(p.color, p.name),
      inStock: p.in_stock !== false,
    }))
    const used = shaped.map((p) => p.id)
    for (const p of shaped) {
      const g = look.gender === 'men' ? 'men' : 'women'
      const withColour = p.colour ? `${p.colour}-${p.group}-${g}` : null
      const base = `${p.group}-${g}`
      const st = (withColour && stylePages.get(withColour)) || stylePages.get(base)
      const label = st
        ? 'Style ideas: ' + (((st.colour ? COLOUR_LABEL[st.colour] + ' ' : '') + (GROUPS[st.group]?.many || st.group)).toLowerCase())
        : null
      extras[p.id] = {
        inStock: p.inStock,
        alt: p.inStock ? null : findAlternative(p, products, { exclude: used, gender: look.gender }),
        style: st ? { slug: st.slug, label } : null,
        brand: brandPages.has(brandSlug(p.brand)) ? brandSlug(p.brand) : null,
      }
    }
    forLess = lookForLess({ ...look, pieces: shaped }, products)
  } catch (e) {
    extras = {}
  }
  const brandLinks = [...new Map(look.pieces.map((p) => [brandSlug(p.brand), canonBrand(p.brand)])).entries()].filter(
    ([slug]) => Object.values(extras).some((x) => x.brand === slug)
  )

  const total = Number(look.total_price)
  const storeCount = new Set(look.pieces.map((p) => p.store)).size
  const hasModel = Boolean(look.model_image_url)

  // Cada ficha enlaza a su categoria. Sin esto las 273 fichas no le pasan
  // ninguna senal a las 16 paginas de categoria, que son las que rankean.
  const related = CATEGORIES.filter(
    (c) =>
      c.gender === look.gender &&
      ((c.occasion && c.occasion === look.occasion) ||
        (c.season && c.season === look.season))
  )

  return (
    <main className="look-detail">
      {hasModel ? (
        <div className="look-hero-split">
          <div className="look-hero-photo">
            <img src={look.model_image_url} style={cutFit(look.model_box, 0.94, 2 / 3)} alt={look.title} />
          </div>
          <div className="look-hero-text">
            <Link href="/" className="back-link-inline">← All outfits</Link>
            <p className="look-kicker">{seoLabel(look)}</p>
            <h1>{look.title}</h1>
            <p className="look-meta">{look.pieces.length} pieces · {storeCount} stores</p>
            <div className="look-actions">
              <a href="#pieces" className="shop-cta">Shop the outfit <span>€{total}</span></a>
              <SaveButton slug={look.slug} className="save-inline" label={['Save', 'Saved']} />
            </div>
            {forLess && (
              <a href="#for-less" className="for-less-link">Get the look for less: €{forLess.total}, save €{forLess.saving}</a>
            )}
            {look.description && <p className="look-hero-desc">{look.description}</p>}
            <p className="look-hero-total">Outfit total · <strong>€{total}</strong></p>
            {look.tags && look.tags.length > 0 && (
              <div className="look-tags">
                {look.tags.map((tag, i) => (
                  <span key={i} className="look-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="look-hero-flat">
            <div className="look-hero-text">
              <Link href="/" className="back-link-inline">← All outfits</Link>
              <p className="look-kicker">{seoLabel(look)}</p>
              <h1>{look.title}</h1>
              <p className="look-meta">{look.pieces.length} pieces · {storeCount} stores · €{total}</p>
              <div className="look-actions">
                <a href="#pieces" className="shop-cta">Shop the outfit <span>€{total}</span></a>
                <SaveButton slug={look.slug} className="save-inline" label={['Save', 'Saved']} />
              </div>
            </div>
            <div className="look-hero-strip">
              {look.pieces.slice(0, 3).map((p) => (
                <div key={p.id} className="look-hero-cell">
                  <img src={p.packshot} alt={p.name} />
                </div>
              ))}
            </div>
          </div>

          {look.description && (
            <section className="look-description">
              <p>{look.description}</p>
            </section>
          )}
        </>
      )}

      {look.reel && (
        <section className="look-reel">
          <video src={look.reel} autoPlay muted loop playsInline controls preload="metadata" aria-label={'Video of the outfit ' + look.title} />
        </section>
      )}

      <PiecesGrid pieces={look.pieces} outfitId={look.id} extras={extras} />

      {forLess && (
        <section className="look-pieces for-less" id="for-less">
          <h2>The same look for less</h2>
          <p className="for-less-sub">
            €{forLess.total} instead of €{Math.round(total)}: similar pieces, same colours, you save €{forLess.saving}.
          </p>
          <div className="ptile-grid">
            {forLess.pieces.map((p) => (
              <div key={p.id} className={p.kept ? 'ptile-kept' : undefined}>
                <PieceTile piece={p} outfitId={look.id} />
                {p.kept && <div className="ptile-note">Same piece</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {brandLinks.length > 0 && (
        <section className="look-pieces" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="pill-links" style={{ justifyContent: 'center' }}>
            {brandLinks.map(([slug, name]) => (
              <Link key={slug} href={'/brand/' + slug}>More from {name}</Link>
            ))}
          </div>
        </section>
      )}


      {related.length > 0 && (
        // Stessa classe della sezione dei pezzi, non un padding inventato: cosi' il bordo
        // sinistro resta allineato al resto della pagina su qualunque schermo. Misurato il
        // 2026-09-13: tutto il resto stava a 28px e questo blocco a 20, si vedeva sporgere.
        // E l'h2 eredita Playfair come gli altri titoli: prima usciva in Outfit, cioe' un
        // carattere diverso da tutta la pagina.
        <section className="look-pieces" style={{ paddingTop: 0, paddingBottom: 72 }}>
          <h2
            style={{
              fontSize: 22,
              margin: '0 0 16px',
              paddingTop: 28,
              borderTop: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            More like this
          </h2>
          {/* Su questa pagina i titoli di sezione sono centrati, The Pieces e Outfit
              total lo sono. Le pastiglie restavano a sinistra sotto un titolo centrato
              e sembrava un errore di impaginazione. */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {related.map((c) => (
              <Link
                key={c.slug}
                href={'/outfits/' + c.slug}
                style={{
                  fontSize: 14,
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(0,0,0,0.12)',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                {c.title}
              </Link>
            ))}
          </div>
        </section>
      )}
      <div style={{ padding: '0 20px' }}>
        <EmailSignup source="look" />
      </div>
      <div className="bottom-spacer"></div>
    </main>
  )
}
