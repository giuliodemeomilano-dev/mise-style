import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const revalidate = 86400

const W = 1000
const H = 1500

// Flat-lay style placements: pieces scattered and overlapping like laid on a table.
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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#EDE7DE',
          padding: '62px 56px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 27, letterSpacing: 11, color: '#B4552F' }}>
          M I S E
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 76,
            lineHeight: 1.05,
            color: '#1A1A1A',
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          {outfit.title || 'The complete outfit'}
        </div>

        {outfit.occasion ? (
          <div style={{ display: 'flex', marginTop: 14, fontSize: 25, letterSpacing: 5, color: '#94897B' }}>
            {String(outfit.occasion).toUpperCase()}
          </div>
        ) : null}

        <div style={{ display: 'flex', position: 'relative', width: 888, height: 860, marginTop: 34 }}>
          {tiles.map((t, i) => {
            const p = layout[i] || layout[layout.length - 1]
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: p.l,
                  top: p.t,
                  width: p.w,
                  height: p.h,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 6,
                  transform: 'rotate(' + p.r + 'deg)',
                  boxShadow: '0 18px 40px rgba(60,45,30,0.16)',
                }}
              >
                <img src={t.src} width={p.w - 26} height={p.h - 26} style={{ objectFit: 'contain' }} />
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexGrow: 1 }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: 888 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 25, letterSpacing: 4, color: '#94897B' }}>
              SHOP THE ENTIRE OUTFIT
            </div>
            <div style={{ display: 'flex', fontSize: 34, color: '#1A1A1A', marginTop: 8, fontWeight: 700 }}>
              mise.style
            </div>
          </div>
          {total ? (
            <div style={{ display: 'flex', fontSize: 66, color: '#1A1A1A', fontWeight: 700 }}>
              {'\u20AC' + total}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
