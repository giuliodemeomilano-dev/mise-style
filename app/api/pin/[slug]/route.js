import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const revalidate = 86400

const W = 1000
const H = 1500

async function toDataUrl(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 MISE-PinBot' } })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) return null
    return 'data:' + type + ';base64,' + buf.toString('base64')
  } catch (e) {
    return null
  }
}

export async function GET(request, { params }) {
  const { slug } = await params

  const { data: outfit } = await supabase
    .from('outfits')
    .select('title, occasion, season, total_price, outfit_items (position, products (name, brand, price, image_url, packshot_url))')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!outfit) return new Response('Not found', { status: 404 })

  const raw = [...(outfit.outfit_items || [])]
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((i) => i.products)
    .filter(Boolean)
    .slice(0, 4)

  const tiles = []
  for (const p of raw) {
    const src = await toDataUrl(p.packshot_url || p.image_url)
    if (src) tiles.push({ src, brand: p.brand || '', price: p.price })
  }

  const total = outfit.total_price ? Math.round(Number(outfit.total_price)) : null
  const tileW = tiles.length <= 2 ? 860 : 414
  const tileH = tiles.length <= 2 ? 480 : 414

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F8F6F1',
          padding: '64px 56px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 10, color: '#B4552F' }}>
          M I S E
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 22,
            fontSize: 68,
            lineHeight: 1.08,
            color: '#1A1A1A',
            fontWeight: 700,
          }}
        >
          {outfit.title || 'The complete outfit'}
        </div>

        {outfit.occasion ? (
          <div style={{ display: 'flex', marginTop: 16, fontSize: 26, letterSpacing: 4, color: '#8A8A85' }}>
            {String(outfit.occasion).toUpperCase()}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            marginTop: 40,
            width: 888,
            justifyContent: 'space-between',
          }}
        >
          {tiles.map((t, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                width: tileW,
                height: tileH,
                marginBottom: 28,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={t.src}
                width={tileW - 40}
                height={tileH - 40}
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexGrow: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            width: 888,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 26, letterSpacing: 3, color: '#8A8A85' }}>
              SHOP THE ENTIRE OUTFIT
            </div>
            <div style={{ display: 'flex', fontSize: 30, color: '#1A1A1A', marginTop: 8 }}>
              mise.style
            </div>
          </div>
          {total ? (
            <div style={{ display: 'flex', fontSize: 62, color: '#1A1A1A', fontWeight: 700 }}>
              {'\u20AC' + total}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
