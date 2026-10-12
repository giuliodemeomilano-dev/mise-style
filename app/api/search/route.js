import { getLooks } from '@/lib/catalog'
import { searchLooks } from '@/lib/search'

export async function GET(request) {
  const sp = new URL(request.url).searchParams
  const f = {
    q: (sp.get('q') || '').slice(0, 80),
    g: ['women', 'men'].includes(sp.get('g')) ? sp.get('g') : null,
    colour: sp.get('colour') || null,
    item: sp.get('item') || null,
    brand: sp.get('brand') || null,
    max: Number(sp.get('max')) || null,
  }
  const found = searchLooks(await getLooks(), f)
  return Response.json(
    { ok: true, count: found.length, looks: found.slice(0, 48) },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
  )
}
