import { supabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 3600

const BASE = 'https://www.mise.style'

export default async function sitemap() {
  const now = new Date()
  const staticPaths = ['', '/journal', '/about', '/how-it-works', '/contact', '/disclosure', '/privacy']
  const staticPages = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.5,
  }))

  let looks = []
  try {
    const { data } = await supabaseAdmin
      .from('outfits')
      .select('slug, created_at')
      .eq('status', 'active')
    looks = (data || [])
      .filter((o) => o.slug)
      .map((o) => ({
        url: `${BASE}/look/${o.slug}`,
        lastModified: o.created_at ? new Date(o.created_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
  } catch (e) {
    // fallback: solo pagine statiche
  }

  let guides = []
  try {
    const { data } = await supabaseAdmin
      .from('guides')
      .select('slug, published_at')
      .eq('status', 'active')
    guides = (data || [])
      .filter((g) => g.slug)
      .map((g) => ({
        url: `${BASE}/journal/${g.slug}`,
        lastModified: g.published_at ? new Date(g.published_at) : now,
        changeFrequency: 'monthly',
        priority: 0.7,
      }))
  } catch (e) {
    // fallback: nessuna guida
  }

  return [...staticPages, ...looks, ...guides]
}
