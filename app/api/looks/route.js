import { getLooks } from '@/lib/catalog'

// Compact look data for the saved-looks page: /api/looks?slugs=a,b,c
export async function GET(request) {
  const slugs = (new URL(request.url).searchParams.get('slugs') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, 200)
  if (!slugs.length) return Response.json({ ok: true, looks: [] })
  const all = await getLooks()
  const bySlug = new Map(all.map((l) => [l.slug, l]))
  const looks = slugs.map((s) => bySlug.get(s)).filter(Boolean)
  return Response.json({ ok: true, looks })
}
