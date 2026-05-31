import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data: outfit } = await supabase
    .from('outfits')
    .select('title, description, hero_image_url, total_price')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!outfit) {
    return { title: 'Look not found — MISE' }
  }

  return {
    title: outfit.title + ' — MISE',
    description: outfit.description || 'Shop the ' + outfit.title + ' look — €' + outfit.total_price + ' across multiple stores. Curated by MISE.',
    openGraph: {
      title: outfit.title + ' — MISE',
      description: outfit.description,
      images: [outfit.hero_image_url],
    },
  }
}

async function getOutfit(slug) {
  const { data: outfit, error } = await supabase
    .from('outfits')
    .select('id, slug, title, description, mood, occasion, budget_tier, tags, hero_image_url, total_price, outfit_items (position, role, products (id, name, brand, merchant, price, image_url, packshot_url, affiliate_url))')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !outfit) return null

  const sortedItems = [...(outfit.outfit_items || [])].sort((a, b) => a.position - b.position)

  return {
    ...outfit,
    pieces: sortedItems.map((item) => ({
      id: item.products?.id,
      name: item.products?.name,
      brand: item.products?.brand,
      store: item.products?.merchant,
      price: item.products?.price,
      img: item.products?.packshot_url || item.products?.image_url,
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

  return (
    <main className="look-detail">
      <div className="look-hero">
        <img src={look.hero_image_url} alt={look.title} />
        <div className="look-hero-overlay">
          <Link href="/" className="back-link">← All looks</Link>
          <div className="look-hero-inner">
          <h1>{look.title}</h1>
          <p className="look-meta">
            {look.pieces.length} pieces · {storeCount} stores · €{total}
          </p>
          {look.tags && look.tags.length > 0 && (
            <div className="look-tags">
              {look.tags.map((tag, i) => (
                <span key={i} className="look-tag">{tag}</span>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {look.description && (
        <section className="look-description">
          <p>{look.description}</p>
        </section>
      )}

      <section className="look-pieces">
        <h2>The Pieces</h2>
        <div className="pieces-grid">
          {look.pieces.map((piece, idx) => (
            <a key={idx} href={`/go/${piece.id}?outfit=${look.id}`} target="_blank" rel="noopener noreferrer sponsored" className="piece-card">
              <div className="piece-image">
                <img src={piece.img} alt={piece.name} loading="lazy" />
              </div>
              <div className="piece-info">
                <div className="piece-brand">{piece.brand}</div>
                <div className="piece-name">{piece.name}</div>
                <div className="piece-price">€{piece.price}</div>
                <div className="piece-cta">Shop at {piece.store} ↗</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="look-total">
        <div className="total-inner">
          <div>
            <div className="total-label">Total Look</div>
            <div className="total-detail">{look.pieces.length} pieces · {storeCount} stores</div>
          </div>
          <div className="total-price">€{total}</div>
        </div>
      </section>

      <div className="bottom-spacer"></div>
    </main>
  )
}
