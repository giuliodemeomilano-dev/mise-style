import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES, findCategory } from '@/lib/categories'

export const revalidate = 3600

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
