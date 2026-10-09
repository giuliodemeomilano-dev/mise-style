import Link from 'next/link'
import { getLooks, buildStylePages, GROUPS } from '@/lib/catalog'

export const revalidate = 3600

export const metadata = {
  title: 'How to Style Anything: Outfit Ideas by Piece and Colour | MISE',
  description:
    'Outfit ideas for every piece in your wardrobe: boots, knitwear, skirts, loafers, bags and more, by colour. Complete looks, every piece shoppable.',
  alternates: { canonical: 'https://www.mise.style/style' },
}

export default async function StyleHub() {
  const pages = buildStylePages(await getLooks())
  const section = (gender) => {
    const base = pages.filter((p) => p.gender === gender && !p.colour).sort((a, b) => b.looks.length - a.looks.length)
    return base.map((b) => ({
      ...b,
      colours: pages
        .filter((p) => p.gender === gender && p.group === b.group && p.colour)
        .sort((x, y) => y.looks.length - x.looks.length),
    }))
  }
  return (
    <main className="seo-page">
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}>← All outfits</Link>
      <p className="seo-kicker">Style guides</p>
      <h1>How to Style It</h1>
      <p className="seo-intro">
        Pick a piece, see every outfit we have built around it. Updated every day with the new looks.
      </p>
      {['women', 'men'].map((g) => (
        <section key={g} className="style-hub">
          <h2 className="seo-h2">{g === 'women' ? 'Women' : 'Men'}</h2>
          <div className="style-hub-grid">
            {section(g).map((b) => (
              <div key={b.slug} className="style-hub-item">
                <Link href={'/style/' + b.slug} className="style-hub-main">
                  {GROUPS[b.group]?.many || b.group} <span>{b.looks.length}</span>
                </Link>
                {b.colours.length > 0 && (
                  <div className="style-hub-colours">
                    {b.colours.map((c) => (
                      <Link key={c.slug} href={'/style/' + c.slug}>{c.title.replace('How to Style ', '').replace(/ for (Women|Men)$/, '')}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
