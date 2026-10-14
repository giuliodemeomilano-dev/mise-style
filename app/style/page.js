import Link from 'next/link'
import { getLooks, buildStylePages, GROUPS } from '@/lib/catalog'
import Tr from '@/app/components/Tr'

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
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}><Tr id="all_outfits">← All outfits</Tr></Link>
      <p className="seo-kicker"><Tr id="style_guides">Style guides</Tr></p>
      <h1><Tr id="how_to_style_it">How to Style It</Tr></h1>
      <p className="seo-intro">
        <Tr id="style_hub_intro">Pick a piece, see every outfit we have built around it. Updated every day with the new looks.</Tr>
      </p>
      {['women', 'men'].map((g) => (
        <section key={g} className="style-hub">
          <h2 className="seo-h2">{g === 'women' ? <Tr id="women">Women</Tr> : <Tr id="men">Men</Tr>}</h2>
          <div className="style-hub-grid">
            {section(g).map((b) => (
              <div key={b.slug} className="style-hub-item">
                <Link href={'/style/' + b.slug} className="style-hub-main">
                  <Tr id="group_many" v={{ group: b.group }}>{GROUPS[b.group]?.many || b.group}</Tr> <span>{b.looks.length}</span>
                </Link>
                {b.colours.length > 0 && (
                  <div className="style-hub-colours">
                    {b.colours.map((c) => (
                      <Link key={c.slug} href={'/style/' + c.slug}><Tr id="colour_item" v={{ group: c.group, colour: c.colour }}>{c.title.replace('How to Style ', '').replace(/ for (Women|Men)$/, '')}</Tr></Link>
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
