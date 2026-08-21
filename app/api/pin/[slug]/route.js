import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const revalidate = 86400

// Base design is authored for a 1000x1500 Pinterest pin.
// ?format=ig renders the same design at 1080x1350 (Instagram 4:5).
const BASE_ZONE_W = 888
const BASE_ZONE_H = 860

const FORMATS = {
  pin: { W: 1000, H: 1500, pad: 56, padY: 62, zoneH: 860, title: 76, brand: 27, occ: 25, foot: 25, site: 34, price: 66 },
  ig: { W: 1080, H: 1350, pad: 64, padY: 56, zoneH: 900, title: 66, brand: 25, occ: 23, foot: 23, site: 30, price: 58 },
  // 1080x1920 — source frame for Reels / Stories / TikTok.
  reel: { W: 1080, H: 1920, pad: 64, padY: 96, zoneH: 1180, title: 78, brand: 28, occ: 26, foot: 26, site: 36, price: 70 },
}

const LAYOUTS = {
  1: [{ l: 190, t: 90, w: 520, h: 620, r: -2 }],
  2: [
    { l: 30, t: 40, w: 470, h: 540, r: -3 },
    { l: 420, t: 240, w: 440, h: 520, r: 3 },
  ],
  3: [
    { l: 20, t: 10, w: 450, h: 500, r: -3 },
    { l: 440, t: 130, w: 415, h: 470, r: 3 },
    { l: 190, t: 470, w: 370, h: 370, r: 6 },
  ],
  4: [
    { l: 10, t: 0, w: 430, h: 470, r: -3 },
    { l: 445, t: 80, w: 405, h: 440, r: 3 },
    { l: 40, t: 430, w: 345, h: 350, r: 5 },
    { l: 430, t: 495, w: 325, h: 325, r: -6 },
  ],
}

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
  const { searchParams } = new URL(request.url)
  const fmtKey = searchParams.get('format')
  const fmt = FORMATS[fmtKey === 'ig' ? 'ig' : fmtKey === 'reel' ? 'reel' : 'pin']

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
    if (src) tiles.push({ src })
  }

  const layout = LAYOUTS[Math.min(tiles.length, 4)] || LAYOUTS[4]
  const total = outfit.total_price ? Math.round(Number(outfit.total_price)) : null

  const contentW = fmt.W - fmt.pad * 2
  const scale = Math.min(contentW / BASE_ZONE_W, fmt.zoneH / BASE_ZONE_H)
  const offsetX = (contentW - BASE_ZONE_W * scale) / 2

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#EDE7DE',
          padding: fmt.padY + 'px ' + fmt.pad + 'px',
        }}
      >
        <div style={{ display: 'flex', fontSize: fmt.brand, letterSpacing: 11, color: '#B4552F' }}>
          M I S E
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 18,
            fontSize: fmt.title,
            lineHeight: 1.05,
            color: '#1A1A1A',
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          {outfit.title || 'The complete outfit'}
        </div>

        {outfit.occasion ? (
          <div style={{ display: 'flex', marginTop: 12, fontSize: fmt.occ, letterSpacing: 5, color: '#94897B' }}>
            {String(outfit.occasion).toUpperCase()}
          </div>
        ) : null}

        <div style={{ display: 'flex', position: 'relative', width: contentW, height: fmt.zoneH, marginTop: 28 }}>
          {tiles.map((t, i) => {
            const p = layout[i] || layout[layout.length - 1]
            const w = Math.round(p.w * scale)
            const h = Math.round(p.h * scale)
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: Math.round(offsetX + p.l * scale),
                  top: Math.round(p.t * scale),
                  width: w,
                  height: h,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 6,
                  transform: 'rotate(' + p.r + 'deg)',
                  boxShadow: '0 18px 40px rgba(60,45,30,0.16)',
                }}
              >
                <img src={t.src} width={w - 24} height={h - 24} style={{ objectFit: 'contain' }} />
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexGrow: 1 }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: contentW }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: fmt.foot, letterSpacing: 4, color: '#94897B' }}>
              SHOP THE ENTIRE OUTFIT
            </div>
            <div style={{ display: 'flex', fontSize: fmt.site, color: '#1A1A1A', marginTop: 8, fontWeight: 700 }}>
              mise.style
            </div>
          </div>
          {total ? (
            <div style={{ display: 'flex', fontSize: fmt.price, color: '#1A1A1A', fontWeight: 700 }}>
              {'\u20AC' + total}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: fmt.W, height: fmt.H }
  )
}
