import Link from 'next/link'
import { liveCategories } from '@/lib/categories'
import Tr from '@/app/components/Tr'

export const revalidate = 3600

export const metadata = {
  title: 'Outfit Ideas for Women and Men: Shop the Full Look | MISE',
  description:
    'Browse outfit ideas by occasion and season: office, casual, weekend, evening, brunch, date night, travel and summer. Every look is complete and every piece is shoppable.',
  alternates: { canonical: 'https://www.mise.style/outfits' },
}

export default function OutfitsIndex() {
  const women = liveCategories().filter((c) => c.gender === 'women')
  const men = liveCategories().filter((c) => c.gender === 'men')

  const group = (heading, list) => (
    <section style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>{heading}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {list.map((c) => (
          <Link
            key={c.slug}
            href={'/outfits/' + c.slug}
            style={{
              display: 'block',
              padding: '18px 20px',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 14,
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 6 }}><Tr id="cat_title" v={{ gender: c.gender, occasion: c.occasion, season: c.season, title: c.title }}>{c.title}</Tr></div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <Tr id="cat_intro" v={{ occasion: c.occasion, season: c.season }}>{c.intro.split(':')[0].trim()}</Tr>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 20px 40px' }}>
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}>
        <Tr id="all_outfits">← All outfits</Tr>
      </Link>

      <h1 style={{ margin: '18px 0 12px', lineHeight: 1.1 }}><Tr id="outfit_ideas">Outfit Ideas</Tr></h1>

      <p style={{ maxWidth: 640, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 36px' }}>
        <Tr id="outfit_ideas_intro">Complete outfits put together across brands, sorted by where you are actually going.
        Every piece is linked, so buy the whole look or just the part you are missing.</Tr>
      </p>

      {group(<Tr id="for_women">For women</Tr>, women)}
      {group(<Tr id="for_men">For men</Tr>, men)}

      <div className="bottom-spacer"></div>
    </main>
  )
}
