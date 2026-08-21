import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600

// Landing pages aimed at what people actually search for.
// Individual look pages are the long tail; these target the head terms.
export const CATEGORIES = [
  {
    slug: 'womens-office-outfits',
    gender: 'women',
    occasion: 'office',
    title: "Women's Office Outfits",
    intro:
      'Work outfits built around tailoring that still feels relaxed — structured trousers, clean shirting and knitwear that carries you from a morning of meetings through to dinner. Every piece is linked, so you can shop the whole look or just the one thing you are missing.',
  },
  {
    slug: 'mens-office-outfits',
    gender: 'men',
    occasion: 'office',
    title: "Men's Office Outfits",
    intro:
      'Office outfits for dress codes that stopped being strict — unstructured blazers, well-cut trousers and shirts that work without a tie. Each look is complete and shoppable piece by piece, across the brands we curate.',
  },
  {
    slug: 'womens-casual-outfits',
    gender: 'women',
    occasion: 'casual',
    title: "Women's Casual Outfits",
    intro:
      'Everyday outfits that look considered without looking like they took effort — relaxed denim, easy knits and a shoe you can actually walk all day in. Built as full looks rather than single pieces.',
  },
  {
    slug: 'mens-casual-outfits',
    gender: 'men',
    occasion: 'casual',
    title: "Men's Casual Outfits",
    intro:
      'Off-duty outfits that still hold their shape — good denim or chinos, a well-made tee or overshirt, and footwear that finishes the whole thing instead of undermining it.',
  },
  {
    slug: 'womens-weekend-outfits',
    gender: 'women',
    occasion: 'weekend',
    title: "Women's Weekend Outfits",
    intro:
      'Weekend outfits for slow mornings and long lunches — soft layers, roomy shapes and fabrics that forgive. Nothing here needs ironing before you leave the house.',
  },
  {
    slug: 'mens-weekend-outfits',
    gender: 'men',
    occasion: 'weekend',
    title: "Men's Weekend Outfits",
    intro:
      'Weekend outfits with none of the effort on show — relaxed trousers, a shirt worn open, and a sneaker that is not shouting for attention.',
  },
  {
    slug: 'womens-evening-outfits',
    gender: 'women',
    occasion: 'evening',
    title: "Women's Evening Outfits",
    intro:
      'Evening outfits that skip the little-black-dress cliche — fluid fabrics, a sharp line somewhere, and jewellery left to do the talking. Dressed up without the costume.',
  },
  {
    slug: 'mens-evening-outfits',
    gender: 'men',
    occasion: 'evening',
    title: "Men's Evening Outfits",
    intro:
      'Evening outfits for dinner rather than black tie — darker tailoring, fine-gauge knits and leather with some weight to it. Smart enough for the room, quiet enough to feel natural.',
  },
  {
    slug: 'womens-brunch-outfits',
    gender: 'women',
    occasion: 'brunch',
    title: "Women's Brunch Outfits",
    intro:
      'Brunch outfits for a table in the sun — linen, stripes, easy shapes and a bag you can genuinely fit things into. Comfortable enough to sit in for three hours.',
  },
  {
    slug: 'mens-brunch-outfits',
    gender: 'men',
    occasion: 'brunch',
    title: "Men's Brunch Outfits",
    intro:
      'Brunch outfits that carry from the terrace to a walk afterwards — linen shirting, lighter trousers and an uncomplicated shoe. Warm-weather dressing without trying too hard.',
  },
  {
    slug: 'womens-date-night-outfits',
    gender: 'women',
    occasion: 'date',
    title: "Women's Date Night Outfits",
    intro:
      'Date night outfits that feel like you rather than a costume — one strong piece, everything else kept quiet around it. Considered, not overdressed.',
  },
  {
    slug: 'mens-date-night-outfits',
    gender: 'men',
    occasion: 'date',
    title: "Men's Date Night Outfits",
    intro:
      'Date night outfits that get the details right — proper fit, restrained colour, and shoes that finish the look. Nothing that tries too obviously.',
  },
  {
    slug: 'womens-travel-outfits',
    gender: 'women',
    occasion: 'travel',
    title: "Women's Travel Outfits",
    intro:
      'Travel outfits built for airports and long train days — fabrics that do not crease, layers you can shed when the temperature changes, and shoes comfortable enough to keep on.',
  },
  {
    slug: 'mens-travel-outfits',
    gender: 'men',
    occasion: 'travel',
    title: "Men's Travel Outfits",
    intro:
      'Travel outfits for days spent moving — soft tailoring, breathable layers and a sneaker you can wear for twelve hours without regretting it.',
  },
  {
    slug: 'womens-summer-outfits',
    gender: 'women',
    season: 'summer',
    title: "Women's Summer Outfits",
    intro:
      'Summer outfits for real heat — linen, cotton and open weaves, in colours that hold up under strong light. Complete looks, every piece shoppable.',
  },
  {
    slug: 'mens-summer-outfits',
    gender: 'men',
    season: 'summer',
    title: "Men's Summer Outfits",
    intro:
      'Summer outfits for heat that does not let up — linen shirting, lighter trousers, and shorts that read as clothing rather than beachwear.',
  },
]

export function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const cat = findCategory(slug)
  if (!cat) return { title: 'Outfits — MISE' }

  return {
    title: cat.title + ' — Shop the Full Look | MISE',
    description: cat.intro,
    alternates: { canonical: 'https://www.mise.style/outfits/' + cat.slug },
    openGraph: {
      title: cat.title + ' | MISE',
      description: cat.intro,
    },
  }
}

async function getLooks(cat) {
  let q = supabase
    .from('outfits')
    .select('id, slug, title, total_price, created_at, outfit_items (position, products (packshot_url, image_url))')
    .eq('status', 'active')
    .eq('gender', cat.gender)

  if (cat.occasion) q = q.eq('occasion', cat.occasion)
  if (cat.season) q = q.eq('season', cat.season)

  const { data } = await q.order('created_at', { ascending: false })

  return (data || []).map((o) => {
    const items = [...(o.outfit_items || [])].sort((a, b) => a.position - b.position)
    const first = items[0] && items[0].products
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      total: o.total_price,
      count: items.length,
      img: first ? first.packshot_url || first.image_url : null,
    }
  })
}

export default async function CategoryPage({ params }) {
  const { slug } = await params
  const cat = findCategory(slug)
  if (!cat) notFound()

  const looks = await getLooks(cat)
  const siblings = CATEGORIES.filter((c) => c.slug !== cat.slug)

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 20px 40px' }}>
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}>
        ← All outfits
      </Link>

      <h1 style={{ margin: '18px 0 12px', lineHeight: 1.1 }}>{cat.title}</h1>

      <p style={{ maxWidth: 640, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 10px' }}>
        {cat.intro}
      </p>

      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 28px' }}>
        {looks.length} outfits · new looks added every day
      </p>

      <section className="looks-section">
        <div className="looks-grid">
          {looks.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 40 }}>
              No outfits in this category yet — new looks are added every day.
            </p>
          )}
          {looks.map((look) => (
            <div key={look.id} className="look-card visible">
              <Link
                href={'/look/' + look.slug}
                className="look-visual"
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div className="model-hero model-hero-clean">
                  {look.img && <img src={look.img} alt={look.title} loading="lazy" />}
                </div>
                <div className="model-info-below">
                  <div className="model-title-dark">{look.title}</div>
                  <div className="model-meta-dark">
                    {look.count} pieces · €{look.total}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 14px' }}>More outfit ideas</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {siblings.map((c) => (
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

      <div className="bottom-spacer"></div>
    </main>
  )
}
