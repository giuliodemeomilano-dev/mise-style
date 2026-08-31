// app/journal/page.js
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 3600

const BASE = 'https://www.mise.style'

export const metadata = {
  title: 'Journal | MISE',
  description:
    'How we think about getting dressed: notes on fabric, colour, proportion and the pieces we keep returning to.',
  alternates: { canonical: BASE + '/journal' },
}

export default async function JournalIndex() {
  let guides = []
  try {
    const { data } = await supabaseAdmin
      .from('guides')
      .select('slug, title, excerpt, hero_image_url, published_at')
      .eq('status', 'active')
      .order('published_at', { ascending: false })
    guides = data || []
  } catch (e) {
    guides = []
  }

  return (
    <main style={wrap}>
      <div style={kicker}>Journal</div>
      <h1 style={h1}>How we think about getting dressed.</h1>
      <p style={intro}>
        Notes on fabric, colour and proportion, and on the pieces we keep coming
        back to. Every one is built from outfits we have actually published.
      </p>

      {guides.length === 0 ? (
        <p style={{ color: '#8a8a8a' }}>Nothing here yet. Check back shortly.</p>
      ) : (
        <ul style={list}>
          {guides.map((g) => (
            <li key={g.slug} style={item}>
              <Link href={'/journal/' + g.slug} style={cardLink}>
                {g.hero_image_url ? (
                  <img src={g.hero_image_url} alt="" style={thumb} />
                ) : (
                  <div style={thumb} />
                )}
                <div>
                  <h2 style={cardTitle}>{g.title}</h2>
                  {g.excerpt ? <p style={cardText}>{g.excerpt}</p> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

const wrap = { maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px' }
const kicker = {
  fontSize: 12,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '#b0553f',
  marginBottom: 16,
}
const h1 = { fontSize: 40, lineHeight: 1.15, margin: '0 0 16px', fontWeight: 500 }
const intro = { fontSize: 17, lineHeight: 1.7, color: '#23282c', margin: '0 0 48px' }
const list = { listStyle: 'none', padding: 0, margin: 0 }
const item = { borderTop: '1px solid #e9e9e9', padding: '24px 0' }
const cardLink = {
  display: 'flex',
  gap: 20,
  alignItems: 'flex-start',
  textDecoration: 'none',
  color: 'inherit',
}
const thumb = {
  width: 96,
  height: 120,
  objectFit: 'contain',
  background: '#f5f5f4',
  flexShrink: 0,
}
const cardTitle = { fontSize: 22, margin: '0 0 8px', fontWeight: 500 }
const cardText = { fontSize: 15, lineHeight: 1.6, color: '#5a5a5a', margin: 0 }
