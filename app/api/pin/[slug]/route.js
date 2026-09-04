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
    .select('title, occasion, season, gender, total_price, outfit_items (position, role, products (name, brand, price, image_url, packshot_url))')
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
    .map((i) => (i.products ? { ...i.products, role: i.role } : null))
    .filter(Boolean)
    .slice(0, 4)

  const tiles = []
  for (const p of raw) {
    const src = await toDataUrl(p.packshot_url || p.image_url)
    if (src) tiles.push({ src, category: p.category || p.role, price: p.price })
  }

  const layout = LAYOUTS[Math.min(tiles.length, 4)] || LAYOUTS[4]
  const total = outfit.total_price ? Math.round(Number(outfit.total_price)) : null

  // format=split: model photo on the left, real packshots stacked on the right
  // with category and price. The photo sells the look, the column proves the
  // pieces. Mirrors a Pinterest layout Giulio found performing well (2026-09-02).
  if (fmtKey === 'split' || fmtKey === 'row' || fmtKey === 'stack') {
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
    // Optional cutouts: ?cut=<url>,<url>,... in the same order as the pieces.
    // Background-free PNGs float on the cream column instead of sitting in white boxes.
    const cutParam = searchParams.get('cut')
    const cuts = cutParam
      ? cutParam
          .split(',')
          .map((c) => c.trim())
          .filter((c) => {
            try {
              return new URL(c).hostname === 'd8j0ntlcm91z4.cloudfront.net'
            } catch (e) {
              return false
            }
          })
      : []
    for (let i = 0; i < tiles.length; i++) {
      if (cuts[i]) {
        const c = await toDataUrl(cuts[i])
        if (c) tiles[i].src = c
      }
    }
    // DETERMINISTIC FRAMING. `focus=<top>,<bottom>` are the fractions of the source
    // image height where the figure really starts and ends, measured from the alpha
    // mask of the background-removed frame, and `ar` is the source width/height. With
    // those two numbers the crop is arithmetic, so the model is never beheaded or cut
    // off at the ankles whatever shape the photo pane is. Guessed percentages did that
    // repeatedly. Defaults keep older URLs rendering.
    const fp = (searchParams.get('focus') || '').split(',').map(Number)
    const fTop = Number.isFinite(fp[0]) ? Math.max(0, Math.min(1, fp[0])) : 0.04
    const fBot = Number.isFinite(fp[1]) ? Math.max(0, Math.min(1, fp[1])) : 0.96
    const srcAR = Number(searchParams.get('ar')) || 768 / 1376
    const photoPane = (W, H) => {
      let dW = W
      let dH = Math.round(W / srcAR)
      if (dH < H) {
        dH = H
        dW = Math.round(H * srcAR)
      }
      const pad = Math.round(0.02 * dH)
      const start = Math.max(0, Math.round(fTop * dH) - pad)
      const end = Math.min(dH, Math.round(fBot * dH) + pad)
      let y = Math.round(start - (H - (end - start)) / 2)
      y = Math.max(0, Math.min(y, Math.max(0, dH - H)))
      const x = Math.max(0, Math.round((dW - W) / 2))
      return (
        <div style={{ width: W, height: H, display: 'flex', overflow: 'hidden' }}>
          <img src={photoData} width={dW} height={dH} style={{ marginTop: -y, marginLeft: -x }} />
        </div>
      )
    }
    // A background-removed PNG keeps the packshot's original canvas, so a bag that sat
    // low in its product photo also sits low in the column and looks badly placed.
    // `cutbox=<ar>,<top>,<bottom>,<left>,<right>;...` carries each cutout's real alpha
    // box, one group per piece in the same order, measured the same way as `focus`.
    // With it every product is optically centred in its cell and drawn at the same
    // visual size instead of inheriting whatever padding the brand shot had.
    const boxes = (searchParams.get('cutbox') || '').split(';')
    const tileImg = (tile, W, H, i) => {
      const p = String(boxes[i] || '').split(',').map(Number)
      const ok = p.length === 5 && p.every((x) => Number.isFinite(x))
      if (!ok) return <img src={tile.src} width={W} height={H} style={{ objectFit: 'contain' }} />
      const ar = p[0] || 1
      // Keep exactly the size objectFit:contain would give, so a bag stays a bag and
      // does not blow up to the height of a dress. The box is used ONLY to recentre:
      // the object's own midpoint is moved to the middle of the cell, which is what
      // was wrong before, since the cutout inherits the packshot's empty canvas.
      const rW = Math.round(Math.min(W, H * ar))
      const rH = Math.round(rW / ar)
      const mx = Math.round(W / 2 - ((p[3] + p[4]) / 2) * rW)
      const my = Math.round(H / 2 - ((p[1] + p[2]) / 2) * rH)
      return (
        <div style={{ width: W, height: H, display: 'flex', overflow: 'hidden' }}>
          <img src={tile.src} width={rW} height={rH} style={{ marginLeft: mx, marginTop: my }} />
        </div>
      )
    }
    // Shared furniture for the row and stack layouts. Same cream, same type, same
    // deterministic framing; only the arrangement changes, which is what gives
    // Pinterest three genuinely different creatives per look instead of one template.
    const CREAM = '#E3D8C8'
    const eyebrowTxt = String(pinLabel(outfit) || '').toUpperCase()
    const totalTxt = total ? '\u20AC' + total : ''
    const n2 = Math.max(1, tiles.length)
    const STRIP_W = 908
    const CELL = Math.floor(STRIP_W / n2)
    const strip = (cellH, light) => (
      <div style={{ width: STRIP_W, marginLeft: 46, display: 'flex' }}>
        {tiles.map((t, i) => (
          <div key={i} style={{ width: CELL, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: CELL - 26, height: cellH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tileImg(t, CELL - 26, cellH, i)}
            </div>
            <div style={{ display: 'flex', marginTop: 14, fontSize: 17, letterSpacing: 4, color: light ? 'rgba(255,255,255,0.78)' : '#6B6055' }}>
              {String(t.category || 'piece').toUpperCase()}
            </div>
            <div style={{ display: 'flex', marginTop: 4, fontSize: 30, color: light ? '#FFFFFF' : '#1A1A1A' }}>
              {'\u20AC' + Math.round(Number(t.price) || 0)}
            </div>
          </div>
        ))}
      </div>
    )

    // format=row: photo on top, the pieces in a row underneath on cream.
    if (fmtKey === 'row') {
      return new ImageResponse(
        (
          <div style={{ width: 1000, height: 1500, display: 'flex', flexDirection: 'column', backgroundColor: CREAM }}>
            {photoPane(1000, 840)}
            <div style={{ width: 1000, height: 660, display: 'flex', flexDirection: 'column', paddingTop: 28, paddingBottom: 34, backgroundColor: CREAM }}>
              <div style={{ marginLeft: 46, display: 'flex', fontSize: 22, letterSpacing: 13, color: '#1A1A1A', fontWeight: 700 }}>MISE</div>
              <div style={{ marginLeft: 46, marginTop: 14, display: 'flex', fontSize: 18, letterSpacing: 5, color: '#6B6055' }}>{eyebrowTxt}</div>
              <div style={{ marginLeft: 46, marginTop: 8, display: 'flex', fontSize: 44, color: '#1A1A1A' }}>{outfit.title}</div>
              <div style={{ marginTop: 20, display: 'flex' }}>{strip(250, false)}</div>
              <div style={{ display: 'flex', flexGrow: 1 }} />
              <div style={{ width: 908, marginLeft: 46, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', marginBottom: 8, fontSize: 18, letterSpacing: 5, color: '#8A7F72' }}>MISE.STYLE</div>
                {total ? <div style={{ display: 'flex', fontSize: 48, color: '#1A1A1A', fontWeight: 700 }}>{totalTxt}</div> : null}
              </div>
            </div>
          </div>
        ),
        { width: 1000, height: 1500 }
      )
    }

    // format=stack: the pieces present at the top on cream, the photo fills below
    // with the title over a dark gradient.
    if (fmtKey === 'stack') {
      return new ImageResponse(
        (
          <div style={{ width: 1000, height: 1500, display: 'flex', flexDirection: 'column', backgroundColor: CREAM }}>
            <div style={{ width: 1000, height: 560, display: 'flex', flexDirection: 'column', paddingTop: 42, backgroundColor: CREAM }}>
              <div style={{ width: 1000, display: 'flex', justifyContent: 'center', fontSize: 24, letterSpacing: 14, color: '#1A1A1A', fontWeight: 700 }}>MISE</div>
              <div style={{ marginTop: 26, display: 'flex' }}>{strip(270, false)}</div>
            </div>
            <div style={{ width: 1000, height: 940, display: 'flex', position: 'relative' }}>
              {photoPane(1000, 940)}
              <div style={{ position: 'absolute', left: 0, top: 500, width: 1000, height: 440, display: 'flex', backgroundImage: 'linear-gradient(to bottom, rgba(20,16,12,0), rgba(20,16,12,0.84))' }} />
              <div style={{ position: 'absolute', left: 46, top: 690, width: 908, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 18, letterSpacing: 5, color: 'rgba(255,255,255,0.72)' }}>{eyebrowTxt}</div>
                <div style={{ display: 'flex', marginTop: 8, fontSize: 46, color: '#FFFFFF' }}>{outfit.title}</div>
                <div style={{ width: 908, marginTop: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', marginBottom: 8, fontSize: 18, letterSpacing: 5, color: 'rgba(255,255,255,0.72)' }}>MISE.STYLE</div>
                  {total ? <div style={{ display: 'flex', fontSize: 46, color: '#FFFFFF', fontWeight: 700 }}>{totalTxt}</div> : null}
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1000, height: 1500 }
      )
    }
    const PHOTO_W = 600
    const COL_W = 1000 - PHOTO_W
    const PAD = 26
    const INNER = COL_W - PAD * 2
    // No white cards: the cutouts sit straight on the column. The column cream is
    // a shade deeper than the page cream so an ecru or white garment still reads.
    // The label goes UNDER each piece, which frees the full column width for the
    // product; with the label beside it, the product was squeezed to half the space.
    const n = Math.max(1, tiles.length)
    const gapV = 14
    const labelH = 44
    const headerH = 140
    const footerH = 120
    const avail = 1500 - headerH - footerH - gapV * n - labelH * n
    const unit = avail / (1.35 + (n - 1))
    return new ImageResponse(
      (
        <div style={{ width: 1000, height: 1500, display: 'flex', flexDirection: 'row', backgroundColor: '#E3D8C8' }}>
          {photoPane(PHOTO_W, 1500)}
          <div style={{ width: COL_W, height: 1500, display: 'flex', flexDirection: 'column', paddingTop: 54, paddingLeft: PAD, backgroundColor: '#E3D8C8' }}>
            <div style={{ display: 'flex', fontSize: 26, letterSpacing: 15, color: '#1A1A1A', fontWeight: 700 }}>
              MISE
            </div>
            <div style={{ display: 'flex', width: INNER, marginTop: 10, marginBottom: 22, fontSize: 14, letterSpacing: 4, color: '#8A7F72' }}>
              {String(pinLabel(outfit)).toUpperCase()}
            </div>
            {tiles.map((t, i) => {
              const h = Math.floor(i === 0 ? unit * 1.35 : unit)
              return (
                <div key={i} style={{ width: INNER, marginBottom: gapV, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: INNER, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tileImg(t, INNER, h, i)}
                  </div>
                  <div style={{ width: INNER, height: labelH, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
                    <div style={{ display: 'flex', fontSize: 17, letterSpacing: 3, color: '#6B6055' }}>
                      {String(t.category || 'piece').toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', fontSize: 26, color: '#1A1A1A' }}>
                      {'\u20AC' + Math.round(Number(t.price) || 0)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', flexGrow: 1 }} />
            <div style={{ width: INNER, marginBottom: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', marginBottom: 8, fontSize: 15, letterSpacing: 4, color: '#8A7F72' }}>
                MISE.STYLE
              </div>
              {total ? (
                <div style={{ display: 'flex', fontSize: 46, color: '#1A1A1A', fontWeight: 700 }}>
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
