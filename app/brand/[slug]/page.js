import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLooks, buildBrandPages, buildStylePages, GROUPS } from '@/lib/catalog'
import LookCard from '@/app/components/LookCard'
import PieceTile from '@/app/components/PieceTile'
import EmailSignup from '@/app/components/EmailSignup'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const looks = await getLooks()
  return buildBrandPages(looks).map((b) => ({ slug: b.slug }))
}

async function getBrand(slug) {
  const looks = await getLooks()
  return { page: buildBrandPages(looks).find((b) => b.slug === slug) || null, looks }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { page } = await getBrand(slug)
  if (!page) return { title: 'Brand not found | MISE' }
  const title = page.brand + ' Outfits: ' + page.looks.length + ' Ways to Wear ' + page.brand + ' | MISE'
  const description =
    'Complete outfits built around ' + page.brand + ', styled with pieces from other brands. ' +
    page.looks.length + ' looks, every piece shoppable in one click.'
  return {
    title,
    description,
    alternates: { canonical: 'https://www.mise.style/brand/' + slug },
    openGraph: { title, description, images: page.looks[0]?.model ? [page.looks[0].model] : [] },
  }
}

function list(words) {
  if (words.length < 2) return words.join('')
  return words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]
}

export default async function BrandPage({ params }) {
  const { slug } = await params
  const { page, looks } = await getBrand(slug)
  if (!page) notFound()

  const prices = page.pieces.map((p) => p.price).filter((n) => n > 0)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const groupCount = {}
  page.pieces.forEach((p) => (groupCount[p.group] = (groupCount[p.group] || 0) + 1))
  const topGroups = Object.entries(groupCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => (GROUPS[g]?.many || g).toLowerCase())
  const partners = {}
  page.looks.forEach((l) =>
    l.pieces.forEach((p) => {
      if (p.brand !== page.brand) partners[p.brand] = (partners[p.brand] || 0) + 1
    })
  )
  const topPartners = Object.entries(partners).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b)
  const women = page.looks.filter((l) => l.gender === 'women').length
  const men = page.looks.length - women

  const pieceLook = {}
  page.looks.forEach((l) => l.pieces.forEach((p) => { if (!pieceLook[p.id]) pieceLook[p.id] = l.id }))
  const shown = [...page.pieces].sort((a, b) => (b.inStock - a.inStock)).slice(0, 12)

  const styles = buildStylePages(looks).filter(
    (s) => !s.colour && s.pieces.some((p) => p.brand === page.brand)
  )
  const others = buildBrandPages(looks).filter((b) => b.slug !== slug)

  return (
    <main className="seo-page">
      <Link href="/brands" className="back-link" style={{ textDecoration: 'none' }}>← All brands</Link>
      <p className="seo-kicker">Brand edit</p>
      <h1>{page.brand} Outfits</h1>
      <p className="seo-intro">
        {page.looks.length} complete outfits built around {page.brand}
        {women && men ? `, ${women} for women and ${men} for men` : ''}. The {page.brand} pieces we style most are{' '}
        {list(topGroups)}, from €{Math.round(min)} to €{Math.round(max)}
        {topPartners.length ? `, usually worn with ${list(topPartners)}` : ''}. Every piece links straight to the shop.
      </p>

      <section className="looks-section" style={{ padding: 0 }}>
        <div className="looks-grid">
          {page.looks.slice(0, 24).map((l) => (
            <LookCard key={l.id} look={l} highlight={l.pieces.filter((p) => p.brand === page.brand).map((p) => p.id)} />
          ))}
        </div>
      </section>

      <h2 className="seo-h2">Shop {page.brand}</h2>
      <div className="ptile-grid">
        {shown.map((p) => (
          <PieceTile key={p.id} piece={p} outfitId={pieceLook[p.id]} />
        ))}
      </div>

      {styles.length > 0 && (
        <>
          <h2 className="seo-h2">How to style it</h2>
          <div className="pill-links">
            {styles.slice(0, 16).map((s) => (
              <Link key={s.slug} href={'/style/' + s.slug}>{s.title.replace('How to Style ', '')}</Link>
            ))}
          </div>
        </>
      )}

      <h2 className="seo-h2">More brands</h2>
      <div className="pill-links">
        {others.map((b) => (
          <Link key={b.slug} href={'/brand/' + b.slug}>{b.brand}</Link>
        ))}
      </div>

      <EmailSignup source={'brand-' + slug} />
    </main>
  )
}
