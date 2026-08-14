// app/journal/[slug]/page.js
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 3600

const BASE = 'https://www.mise.style'

async function getGuide(slug) {
  try {
    const { data } = await supabaseAdmin
      .from('guides')
      .select('slug, title, excerpt, meta_description, body_html, hero_image_url, published_at')
      .eq('slug', slug)
      .eq('status', 'active')
      .limit(1)
    return (data && data[0]) || null
  } catch (e) {
    return null
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const g = await getGuide(slug)
  if (!g) return { title: 'Journal — MISE' }
  const desc = g.meta_description || g.excerpt || undefined
  return {
    title: g.title + ' — MISE',
    description: desc,
    alternates: { canonical: BASE + '/journal/' + g.slug },
    openGraph: {
      title: g.title,
      description: desc,
      url: BASE + '/journal/' + g.slug,
      type: 'article',
      images: g.hero_image_url ? [g.hero_image_url] : undefined,
    },
  }
}

export default async function GuidePage({ params }) {
  const { slug } = await params
  const g = await getGuide(slug)
  if (!g) notFound()

  let date = null
  try {
    date = g.published_at
      ? new Date(g.published_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null
  } catch (e) {}

  return (
    <main style={wrap}>
      <div style={kicker}>
        <Link href="/journal" style={linkAccent}>
          Journal
        </Link>
      </div>

      <h1 style={h1}>{g.title}</h1>
      {date ? <div style={dateStyle}>{date}</div> : null}

      <article
        className="journal-body"
        dangerouslySetInnerHTML={{ __html: g.body_html }}
      />

      <p style={foot}>
        Every piece in the outfits above links straight to the retailer. We earn a
        commission on some of them, which is disclosed{' '}
        <Link href="/disclosure" style={linkAccent}>
          here
        </Link>
        .
      </p>

      <p style={{ marginTop: 32 }}>
        <Link href="/journal" style={linkAccent}>
          ← All journal entries
        </Link>
      </p>

      <style>{`
        .journal-body { font-size: 16px; line-height: 1.75; color: #23282c; }
        .journal-body p { margin: 0 0 18px; }
        .journal-body p.lede { font-size: 19px; line-height: 1.6; }
        .journal-body h2 { font-size: 22px; margin: 38px 0 12px; font-weight: 500; }
        .journal-body a { color: #b0553f; text-decoration: none; border-bottom: 1px solid rgba(176,85,63,0.35); }
        .journal-body a:hover { border-bottom-color: #b0553f; }
        .journal-body em { font-style: italic; }
      `}</style>
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
const h1 = { fontSize: 40, lineHeight: 1.15, margin: '0 0 12px', fontWeight: 500 }
const dateStyle = { fontSize: 13, color: '#8a8a8a', marginBottom: 32 }
const foot = {
  fontSize: 13,
  color: '#8a8a8a',
  marginTop: 48,
  paddingTop: 20,
  borderTop: '1px solid #e9e9e9',
}
const linkAccent = { color: '#b0553f', textDecoration: 'none' }
