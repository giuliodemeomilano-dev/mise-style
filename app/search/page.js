import { getLooks } from '@/lib/catalog'
import { facets, searchLooks } from '@/lib/search'
import SearchClient from './SearchClient'

export const revalidate = 3600

export const metadata = {
  title: 'Search Outfits by Colour, Piece and Brand | MISE',
  description: 'Find complete outfits by colour, piece, brand and budget. Every piece shoppable in one click.',
  alternates: { canonical: 'https://www.mise.style/search' },
  robots: { index: false, follow: true },
}

export default async function SearchPage() {
  const looks = await getLooks()
  const f = facets(looks)
  const first = searchLooks(looks, { g: 'women' })
  return <SearchClient facets={f} initial={{ count: first.length, looks: first.slice(0, 48) }} />
}
