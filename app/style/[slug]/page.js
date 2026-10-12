import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLooks, buildStylePages, GROUPS, COLOUR_LABEL, brandSlug } from '@/lib/catalog'
import LookCard from '@/app/components/LookCard'
import PieceTile from '@/app/components/PieceTile'
import EmailSignup from '@/app/components/EmailSignup'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  return buildStylePages(await getLooks()).map((s) => ({ slug: s.slug }))
}

async function getStyle(slug) {
  const pages = buildStylePages(await getLooks())
  return { page: pages.find((s) => s.slug === slug) || null, pages }
}

const OCC = { office: 'the office', casual: 'casual days', weekend: 'the weekend', evening: 'evenings out', brunch: 'brunch', date: 'date night', travel: 'travel' }

function list(words) {
  if (words.length < 2) return words.join('')
  return words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]
}

function itemName(page) {
  const g = GROUPS[page.group]?.many || page.group
  return ((page.colour ? COLOUR_LABEL[page.colour] + ' ' : '') + g).toLowerCase()
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { page } = await getStyle(slug)
  if (!page) return { title: 'Not found | MISE' }
  const title = page.title + ': ' + page.looks.length + ' Outfit Ideas | MISE'
  const description =
    page.looks.length + ' complete outfits with ' + itemName(page) +
    ', styled head to toe. See what to wear them with and shop every piece in one click.'
  return {
    title,
    description,
    alternates: { canonical: 'https://www.mise.style/style/' + slug },
    openGraph: { title, description, images: page.looks[0]?.model ? [page.looks[0].model] : [] },
  }
}

export default async function StylePage({ params }) {
  const { slug } = await params
  const { page, pages } = await getStyle(slug)
  if (!page) notFound()

  const ids = new Set(page.pieces.map((p) => p.id))
  // What it is worn with: the other pieces' types across all the looks.
  const withCount = {}
  const occCount = {}
  page.looks.forEach((l) => {
    occCount[l.occasion] = (occCount[l.occasion] || 0) + 1
    l.pieces.forEach((p) => {
      if (ids.has(p.id) || p.group === page.group) return
      const label = ((p.colour ? COLOUR_LABEL[p.colour] + ' ' : '') + (GROUPS[p.group]?.many || p.group)).toLowerCase()
      withCount[label] = (withCount[label] || 0) + 1
    })
  })
  const pairs = Object.entries(withCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)
  const occs = Object.entries(occCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => OCC[k] || k)
  const prices = page.pieces.map((p) => p.price).filter((n) => n > 0)
  const brands = [...new Set(page.pieces.map((p) => p.brand))]
  const name = itemName(page)
  const Name = name.charAt(0).toUpperCase() + name.slice(1)

  const pieceLook = {}
  page.looks.forEach((l) => l.pieces.forEach((p) => { if (!pieceLook[p.id]) pieceLook[p.id] = l.id }))
  const shown = [...page.pieces].sort((a, b) => (b.inStock - a.inStock) || a.price - b.price).slice(0, 12)

  const sameItem = pages.filter((s) => s.slug !== slug && s.group === page.group && s.gender === page.gender)
  const sameColour = page.colour
    ? pages.filter((s) => s.slug !== slug && s.colour === page.colour && s.gender === page.gender && s.group !== page.group)
    : pages.filter((s) => s.slug !== slug && !s.colour && s.gender === page.gender && s.group !== page.group)

  return (
    <main className="seo-page">
      <Link href="/style" className="back-link" style={{ textDecoration: 'none' }}>← How to style</Link>
      <p className="seo-kicker">{page.gender === 'men' ? 'Menswear' : 'Womenswear'} style guide</p>
      <h1>{page.title}</h1>
      <p className="seo-intro">
        {page.looks.length} complete outfits with {name}, put together by MISE.
        {pairs.length ? ` In our looks they are worn most often with ${list(pairs)}.` : ''}
        {occs.length ? ` They work best for ${list(occs)}.` : ''}
        {prices.length ? ` The pieces below go from €${Math.round(Math.min(...prices))} to €${Math.round(Math.max(...prices))}, from ${list(brands.slice(0, 4))}.` : ''}
      </p>

      <section className="looks-section" style={{ padding: 0 }}>
        <div className="looks-grid">
          {page.looks.slice(0, 24).map((l) => (
            <LookCard key={l.id} look={l} highlight={l.pieces.filter((p) => ids.has(p.id)).map((p) => p.id)} />
          ))}
        </div>
      </section>

      <h2 className="seo-h2">Shop {name}</h2>
      <div className="ptile-grid">
        {shown.map((p) => (
          <PieceTile key={p.id} piece={p} outfitId={pieceLook[p.id]} />
        ))}
      </div>

      <section className="seo-notes">
        <h2 className="seo-h2">How we style {name}</h2>
        <p>
          {Name} carry the outfit when everything around them is quieter.
          {pairs[0] ? ` The pairing we come back to is ${pairs[0]}` : ''}
          {pairs[1] ? `, with ${pairs[1]} as the second option` : ''}
          {pairs.length ? '.' : ''} Each look above is complete: open it to see every piece, the total price and where each one is sold.
        </p>
        {brands.length > 0 && (
          <p>
            Brands in this edit:{' '}
            {brands.map((b, i) => (
              <span key={b}>
                {i ? ', ' : ''}
                <Link href={'/brand/' + brandSlug(b)}>{b}</Link>
              </span>
            ))}
            .
          </p>
        )}
      </section>

      {sameItem.length > 0 && (
        <>
          <h2 className="seo-h2">Other colours</h2>
          <div className="pill-links">
            {sameItem.slice(0, 14).map((s) => (
              <Link key={s.slug} href={'/style/' + s.slug}>{s.title.replace('How to Style ', '')}</Link>
            ))}
          </div>
        </>
      )}
      {sameColour.length > 0 && (
        <>
          <h2 className="seo-h2">{page.colour ? 'More in ' + COLOUR_LABEL[page.colour] : 'More style guides'}</h2>
          <div className="pill-links">
            {sameColour.slice(0, 14).map((s) => (
              <Link key={s.slug} href={'/style/' + s.slug}>{s.title.replace('How to Style ', '')}</Link>
            ))}
          </div>
        </>
      )}

      <EmailSignup source={'style-' + slug} />
    </main>
  )
}
