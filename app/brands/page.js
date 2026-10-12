import Link from 'next/link'
import { getLooks, buildBrandPages } from '@/lib/catalog'
import { cutFit } from '@/lib/fit'

export const revalidate = 3600

export const metadata = {
  title: 'Shop by Brand: Complete Outfits from COS, Sandro, Massimo Dutti and more | MISE',
  description:
    'Outfits built around the brands you love, each styled with pieces from other stores. Every piece shoppable in one click.',
  alternates: { canonical: 'https://www.mise.style/brands' },
}

export default async function BrandsPage() {
  const brands = buildBrandPages(await getLooks()).sort((a, b) => b.looks.length - a.looks.length)
  return (
    <main className="seo-page">
      <Link href="/" className="back-link" style={{ textDecoration: 'none' }}>← All outfits</Link>
      <p className="seo-kicker">Shop by brand</p>
      <h1>Brands</h1>
      <p className="seo-intro">
        Every outfit on MISE mixes brands. Pick one you love and see every way we have styled it.
      </p>
      <div className="brand-grid">
        {brands.map((b) => {
          const p = b.pieces.find((x) => x.cut) || b.pieces[0]
          return (
            <Link key={b.slug} href={'/brand/' + b.slug} className="brand-tile">
              <div className="brand-tile-img">
                {p && <img src={p.packshot} style={cutFit(p.box, 0.7)} alt={b.brand} loading="lazy" />}
              </div>
              <div className="brand-tile-name">{b.brand}</div>
              <div className="brand-tile-count">{b.looks.length} outfits</div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
