import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES, findCategory, liveCategories } from '@/lib/categories'
import { getCategoryCopy } from '@/lib/category-copy'
import { cutFit } from '@/lib/fit'
import Tr, { EnOnly } from '@/app/components/Tr'

export const revalidate = 3600

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const cat = findCategory(slug)
  if (!cat) return { title: 'Outfits | MISE' }

  return {
    title: cat.title + ': Shop the Full Look | MISE',
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
    .select('id, slug, title, total_price, created_at, model_image_url, model_box, outfit_items (position, products (packshot_url, image_url, cutout_url, cutout_box))')
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
      img: first ? first.cutout_url || first.packshot_url || first.image_url : null,
      box: first ? first.cutout_box : null,
      cut: Boolean(first && first.cutout_url),
      // The model figure, same as the home and the brand pages. Before this the
      // category cards showed only the first packshot, a lone dress or jumper.
      model: o.model_image_url || null,
      modelBox: o.model_box || null,
    }
  })
}

export default async function CategoryPage({ params }) {
  const { slug } = await params
  const cat = findCategory(slug)
  if (!cat) notFound()

  const looks = await getLooks(cat)
  const siblings = liveCategories().filter((c) => c.slug !== cat.slug)
  const copy = getCategoryCopy(slug)
  const cv = { gender: cat.gender, occasion: cat.occasion, season: cat.season, title: cat.title }

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 20px 40px' }}>
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}>
        <Tr id="all_outfits">← All outfits</Tr>
      </Link>

      <h1 style={{ margin: '18px 0 12px', lineHeight: 1.1 }}><Tr id="cat_title" v={cv}>{cat.title}</Tr></h1>

      <p style={{ maxWidth: 640, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 10px' }}>
        <Tr id="cat_intro" v={cv}>{cat.intro}</Tr>
      </p>

      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 28px' }}>
        <Tr id="cat_count" v={{ n: looks.length }}>{looks.length} outfits · new looks added every day</Tr>
      </p>

      <section className="looks-section">
        <div className="looks-grid">
          {looks.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 40 }}>
              <Tr id="cat_empty">No outfits in this category yet. New looks are added every day.</Tr>
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
                  {look.model ? (
                    <img src={look.model} className="is-model" style={cutFit(look.modelBox, 0.82, 0.92)} alt={look.title} loading="lazy" />
                  ) : look.img ? (
                    <img src={look.img} className={look.cut ? 'is-cut' : undefined} style={cutFit(look.box, 0.78)} alt={look.title} loading="lazy" />
                  ) : null}
                </div>
                <div className="model-info-below">
                  <div className="model-title-dark">{look.title}</div>
                  <div className="model-meta-dark">
                    <Tr id="count_total" v={{ n: look.count, t: look.total }}>{look.count} pieces · €{look.total}</Tr>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {copy && (
        <EnOnly>
        <section
          style={{
            marginTop: 56,
            paddingTop: 28,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            maxWidth: 720,
          }}
        >
          <h2 style={{ fontSize: 20, margin: '0 0 14px' }}>{copy.heading}</h2>
          {copy.body.map((p, i) => (
            <p
              key={i}
              style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 14px' }}
            >
              {p}
            </p>
          ))}
        </section>
        </EnOnly>
      )}

      {copy && (
        <section style={{ marginTop: 40, maxWidth: 720 }}>
          <EnOnly>
          <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>Questions people ask</h2>
          {copy.faq.map((f, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, margin: '0 0 6px' }}>{f.q}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                {f.a}
              </p>
            </div>
          ))}
          </EnOnly>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: copy.faq.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              }),
            }}
          />
        </section>
      )}
      <section style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 14px' }}><Tr id="more_ideas">More outfit ideas</Tr></h2>
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
              <Tr id="cat_title" v={{ gender: c.gender, occasion: c.occasion, season: c.season, title: c.title }}>{c.title}</Tr>
            </Link>
          ))}
        </div>
      </section>

      <div className="bottom-spacer"></div>
    </main>
  )
}
