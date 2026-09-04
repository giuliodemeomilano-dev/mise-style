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
  // zoneH is width-limited here (contentW/BASE_ZONE_W * BASE_ZONE_H), so the
  // flat-lay hugs its content instead of leaving a dead band under it.
  reel: { W: 1080, H: 1920, pad: 56, padY: 150, zoneH: 936, title: 80, brand: 28, occ: 26, foot: 26, site: 36, price: 72 },
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

// Pinterest shows only the image in the feed, so the big line has to answer
// "what is this and who is it for", not carry an editorial name. The pretty
// title drops to the small line underneath. Mirrors seoLabel in app/look/[slug].
const OCCASION_LABEL = {
  office: 'Office',
  casual: 'Casual',
  weekend: 'Weekend',
  evening: 'Evening',
  brunch: 'Brunch',
  date: 'Date Night',
  travel: 'Travel',
}
const SEASON_LABEL = { summer: 'Summer', spring: 'Spring', autumn: 'Autumn', winter: 'Winter' }

function pinLabel(outfit) {
  const who = outfit.gender === 'men' ? "Men's" : outfit.gender === 'women' ? "Women's" : ''
  const label = [who, SEASON_LABEL[outfit.season] || '', OCCASION_LABEL[outfit.occasion] || '', 'Outfit']
    .filter(Boolean)
    .join(' ')
  return label === 'Outfit' ? outfit.title || 'The complete outfit' : label
}

export async function GET(request, { params }) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  // Optional photographic backdrop. Keeps the packshots real — only the
  // scene behind them is generated.
  const BACKGROUNDS = {
    riviera:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38aJYuFTe3dVNnSIjvrFEDuhlJG/hf_20260821_105854_7e4263de-ae28-4db6-8038-c37c852f07a1.png',
  }

  const fmtKey = searchParams.get('format')
  const fmt = FORMATS[fmtKey === 'ig' ? 'ig' : fmtKey === 'reel' ? 'reel' : 'pin']

  const { data: outfit } = await supabase
    .from('outfits')
    .select('title, occasion, season, gender, total_price, outfit_items (position, products (name, brand, price, image_url, packshot_url))')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!outfit) return new Response('Not found', { status: 404 })

  // format=model renders an aspirational 2:3 pin: a generated model frame full
  // bleed, with a solid band so the type stays legible on any photograph. Only
  // the scene and the figure are generated. This format deliberately shows no
  // packshots, so it never misrepresents a real product.
  if (fmtKey === 'model') {
    let safe = null
    try {
      const u = new URL(searchParams.get('img'))
      if (u.hostname === 'd8j0ntlcm91z4.cloudfront.net') safe = u.toString()
    } catch (e) {}
    if (!safe) return new Response('format=model needs a Higgsfield img URL', { status: 400 })
    // Frames arrive at 1536x2752, far too heavy for next/og to rasterise directly.
    // Route them through the Vercel image optimizer to get a light 1080px JPEG.
    const origin = new URL(request.url).origin
    const photoSrc = origin + '/_next/image?url=' + encodeURIComponent(safe) + '&w=1200&q=75'
    // w must be one of the project's allowed widths: 1080 is rejected, 1200 is not.
    // At 1200px the result is light enough to inline, which the raw 1536x2752 never was.
    const opt = await fetch(photoSrc)
    if (!opt.ok) return new Response('Could not optimize img: ' + opt.status, { status: 502 })
    const photoData =
      'data:' +
      (opt.headers.get('content-type') || 'image/png') +
      ';base64,' +
      Buffer.from(await opt.arrayBuffer()).toString('base64')
    const mTotal = outfit.total_price ? Math.round(Number(outfit.total_price)) : null
    return new ImageResponse(
      (
        <div
          style={{
            width: 1000,
            height: 1500,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#1A1A1A',
            backgroundImage: 'url(' + photoData + ')',
            // 'cover' keeps the frame's aspect. Fixed px squashed a 1536x2752 source.
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div style={{ display: 'flex', paddingTop: 46, paddingLeft: 50 }}>
            <div style={{ display: 'flex', fontSize: 22, letterSpacing: 13, color: '#FFFFFF' }}>
              MISE
            </div>
          </div>
          <div
            style={{
              width: 1000,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 44,
              paddingBottom: 48,
              backgroundColor: 'rgba(26,26,26,0.82)',
            }}
          >
            <div style={{ width: 900, marginLeft: 50, display: 'flex', fontSize: 56, lineHeight: 1.14, color: '#F6F1EA' }}>
              {outfit.title}
            </div>
            <div style={{ width: 900, marginLeft: 50, marginTop: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', fontSize: 23, letterSpacing: 8, color: '#A99C8E' }}>
                MISE.STYLE
              </div>
              {mTotal ? (
                <div style={{ display: 'flex', fontSize: 58, color: '#E8A87C' }}>
                  {'\u20AC' + mTotal}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      { width: 1000, height: 1500 }
    )
  }

  const raw = [...(outfit.outfit_items || [])]
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((i) => i.products)
    .filter(Boolean)
    .slice(0, 4)

  const tiles = []
  for (const p of raw) {
    const src = await toDataUrl(p.packshot_url || p.image_url)
    if (src) tiles.push({ src, category: p.category, price: p.price })
  }

  const layout = LAYOUTS[Math.min(tiles.length, 4)] || LAYOUTS[4]
  const total = outfit.total_price ? Math.round(Number(outfit.total_price)) : null

  // format=split: model photo on the left, real packshots stacked on the right
  // with category and price. The photo sells the look, the column proves the
  // pieces. Mirrors a Pinterest layout Giulio found performing well (2026-09-02).
  if (fmtKey === 'split') {
    let safe = null
    try {
      const u = new URL(searchParams.get('img'))
      if (u.hostname === 'd8j0ntlcm91z4.cloudfront.net') safe = u.toString()
    } catch (e) {}
    if (!safe) return new Response('format=split needs a Higgsfield img URL', { status: 400 })
    const origin = new URL(request.url).origin
    const photoSrc = origin + '/_next/image?url=' + encodeURIComponent(safe) + '&w=1200&q=75'
    const opt = await fetch(photoSrc)
    if (!opt.ok) return new Response('Could not optimize img: ' + opt.status, { status: 502 })
    const photoData =
      'data:' +
      (opt.headers.get('content-type') || 'image/png') +
      ';base64,' +
      Buffer.from(await opt.arrayBuffer()).toString('base64')
    const n = Math.max(1, tiles.length)
    const avail = 1500 - 74 - 76
    const gap = 14
    const tileH = Math.floor((avail - gap * (n - 1)) / n)
    const imgH = tileH - 40
    return new ImageResponse(
      (
        <div style={{ width: 1000, height: 1500, display: 'flex', flexDirection: 'row', backgroundColor: '#EDE7DE' }}>
          <div
            style={{
              width: 600,
              height: 1500,
              display: 'flex',
              backgroundImage: 'url(' + photoData + ')',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div style={{ width: 400, height: 1500, display: 'flex', flexDirection: 'column', paddingTop: 40, paddingBottom: 36, backgroundColor: '#EDE7DE' }}>
            <div style={{ display: 'flex', marginLeft: 28, fontSize: 20, letterSpacing: 10, color: '#B4552F', marginBottom: 14 }}>
              MISE
            </div>
            {tiles.map((t, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', width: 344, height: tileH, marginLeft: 28, marginTop: i === 0 ? 0 : gap }}>
                <div
                  style={{
                    width: 344,
                    height: imgH,
                    display: 'flex',
                    backgroundColor: '#FFFFFF',
                    backgroundImage: 'url(' + t.src + ')',
                    backgroundSize: '84% 84%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                />
                <div style={{ display: 'flex', marginTop: 8, fontSize: 17, letterSpacing: 3, color: '#5C5249' }}>
                  {String(t.category || 'piece').toUpperCase() + '  \u00B7  \u20AC' + Math.round(Number(t.price) || 0)}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', flexGrow: 1 }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: 344, marginLeft: 28 }}>
              <div style={{ display: 'flex', fontSize: 16, letterSpacing: 3, color: '#94897B' }}>
                MISE.STYLE
              </div>
              {total ? (
                <div style={{ display: 'flex', fontSize: 40, color: '#1A1A1A', fontWeight: 700 }}>
                  {'\u20AC' + total}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      { width: 1000, height: 1500 }
    )
  }

  const contentW = fmt.W - fmt.pad * 2
  const scale = Math.min(contentW / BASE_ZONE_W, fmt.zoneH / BASE_ZONE_H)
  const offsetX = (contentW - BASE_ZONE_W * scale) / 2

  const bgData = BACKGROUNDS[searchParams.get('bg')]
    ? await toDataUrl(BACKGROUNDS[searchParams.get('bg')])
    : null

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
        {bgData ? (
          <img
            src={bgData}
            width={fmt.W}
            height={fmt.H}
            style={{ position: 'absolute', top: 0, left: 0, width: fmt.W, height: fmt.H }}
          />
        ) : null}
        {bgData ? (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width: fmt.W,
              height: fmt.H,
              backgroundColor: 'rgba(237, 231, 222, 0.58)',
            }}
          />
        ) : null}
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
          {pinLabel(outfit)}
        </div>

        {outfit.title ? (
          <div style={{ display: 'flex', marginTop: 12, fontSize: fmt.occ, letterSpacing: 5, color: '#94897B' }}>
            {String(outfit.title).toUpperCase()}
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
