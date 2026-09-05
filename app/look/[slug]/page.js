import { supabase } from '@/lib/supabase'
import PiecesGrid from './PiecesGrid'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
    .select('id, slug, title, description, mood, occasion, season, gender, budget_tier, tags, hero_image_url, model_image_url, total_price, outfit_items (position, role, products (id, external_id, category, name, brand, merchant, price, image_url, packshot_url, affiliate_url))')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !outfit) return null

  const sortedItems = [...(outfit.outfit_items || [])].sort((a, b) => a.position - b.position)

  return {
    ...outfit,
    pieces: sortedItems.map((item) => ({
      id: item.products?.id,
      external_id: item.products?.external_id,
      category: item.products?.category,
      name: item.products?.name,
      brand: item.products?.brand,
      store: item.products?.merchant,
      price: item.products?.price,
      img: item.products?.image_url,
      packshot: item.products?.packshot_url || item.products?.image_url,
      url: item.products?.affiliate_url,
    })),
  }
}

export default async function LookPage({ params }) {
  const { slug } = await params
  const look = await getOutfit(slug)

  if (!look) notFound()

  const total = Number(look.total_price)
  const storeCount = new Set(look.pieces.map((p) => p.store)).size
  const hasModel = Boolean(look.model_image_url)

  return (
    <main className="look-detail">
      {hasModel ? (
        <div className="look-hero-split">
          <div className="look-hero-photo">
            <img src={look.model_image_url} alt={look.title} />
          </div>
          <div className="look-hero-text">
            <Link href="/" className="back-link-inline">← All outfits</Link>
            <p className="look-kicker">{seoLabel(look)}</p>
            <h1>{look.title}</h1>
            <p className="look-meta">{look.pieces.length} pieces · {storeCount} stores</p>
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

      <PiecesGrid pieces={look.pieces} outfitId={look.id} />


      <div className="bottom-spacer"></div>
    </main>
  )
}
