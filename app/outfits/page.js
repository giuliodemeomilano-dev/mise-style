import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 3600

export const metadata = {
  title: 'Outfit Ideas for Women and Men: Shop the Full Look | MISE',
  description:
    'Browse outfit ideas by occasion and season: office, casual, weekend, evening, brunch, date night, travel and summer. Every look is complete and every piece is shoppable.',
  alternates: { canonical: 'https://www.mise.style/outfits' },
}

export default function OutfitsIndex() {
  const women = CATEGORIES.filter((c) => c.gender === 'women')
  const men = CATEGORIES.filter((c) => c.gender === 'men')

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
            <div style={{ fontSize: 16, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {c.intro.split('—')[0].trim()}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 20px 40px' }}>
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}>
        ← All outfits
      </Link>

      <h1 style={{ margin: '18px 0 12px', lineHeight: 1.1 }}>Outfit Ideas</h1>

      <p style={{ maxWidth: 640, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 36px' }}>
        Complete outfits put together across brands, sorted by where you are actually going.
        Every piece is linked, so buy the whole look or just the part you are missing.
      </p>

      {group('For women', women)}
      {group('For men', men)}

      <div className="bottom-spacer"></div>
    </main>
  )
}
