import sharp from 'sharp'

export const runtime = 'nodejs'

// Free background remover for flat studio packshots.
//
// The brands ship on near-uniform light backgrounds (measured 2026-09-06: Massimo
// Dutti 246, Ancient Greek Sandals 255, Mejuri 248, Castaner 232), so a colour
// flood from the borders lifts them with no AI and no credits. This exists for the
// ~660 products with no paid cut-out, so they can still sit on the MISE cream.
//
// IT REFUSES RATHER THAN RUINS. A pale garment on a pale background is the case
// that breaks this technique: the fill walks straight into the garment. Every
// result is sanity-checked and anything suspicious returns the ORIGINAL image
// untouched. A visible grey box is a far smaller sin than a dress with a hole in
// it, on a site where people are deciding whether to buy the thing.
//
// Add &debug=1 to get the measurements as JSON instead of an image.

const ALLOWED = [
  'media.cos.com',
  'static.massimodutti.net',
  'cdn.shopify.com',
  'images.hugoboss.com',
  'mejuri.com',
  'eu.sunspel.com',
  'd8j0ntlcm91z4.cloudfront.net',
]

const MAX = 1000 // work at this size: plenty for the site and ~6x faster than full
const TOL = 26   // colour distance that still counts as background
const SOFT = 14  // extra distance that gets a feathered alpha instead of a hard cut

// Refusal thresholds, all calibrated on real product photos 2026-09-06.
const CORNER_SPREAD = 18 // corners must agree or it is a scene, not a sweep
const MIN_LIGHT = 600    // sum of the background RGB: light backgrounds only
const MIN_CLEARED = 0.15
const MAX_CLEARED = 0.92
const MAX_CENTRE_BG = 0.98
const MIN_KEPT = 0.03   // the product has to survive as at least this much of the frame

function dist(a, b) {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function send(buf, type) {
  return new Response(buf, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url')
  const debug = searchParams.get('debug') === '1'
  // &force=1 cuts even when the checks say no. For calibrating by eye, never for the site.
  const force = searchParams.get('force') === '1'
  if (!raw) return new Response('missing url', { status: 400 })

  let src
  try {
    src = new URL(raw)
  } catch (e) {
    return new Response('bad url', { status: 400 })
  }
  if (!ALLOWED.includes(src.hostname)) {
    return new Response('host not allowed', { status: 400 })
  }

  const upstream = await fetch(src.toString())
  if (!upstream.ok) return new Response('upstream ' + upstream.status, { status: 502 })
  const ctype = upstream.headers.get('content-type') || 'image/jpeg'
  const input = Buffer.from(await upstream.arrayBuffer())

  try {
    const { data, info } = await sharp(input)
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const W = info.width
    const H = info.height
    const C = info.channels
    const at = (x, y) => (y * W + x) * C
    const px = (x, y) => [data[at(x, y)], data[at(x, y) + 1], data[at(x, y) + 2]]
    const cs = [px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)]
    const bg = [0, 1, 2].map((i) =>
      Math.round(cs.reduce((s, c) => s + c[i], 0) / cs.length)
    )
    const spread = Math.max(...cs.map((c) => dist(c, bg)))

    // How much of the MIDDLE of the frame is already background-coloured. Kept only
    // as a backstop for an empty or near-empty frame: it does NOT separate a pale
    // garment from a thin one. Measured 2026-09-06, a flat sandal that cuts
    // perfectly scores 0.71 and a pale short that cuts badly scores 0.77.
    let centre = 0
    let centreTot = 0
    for (let y = Math.round(H * 0.25); y < H * 0.75; y++) {
      for (let x = Math.round(W * 0.25); x < W * 0.75; x++) {
        centreTot++
        if (dist(px(x, y), bg) <= TOL) centre++
      }
    }
    const centreBg = centre / centreTot

    const seen = new Uint8Array(W * H)
    const stack = []
    for (let x = 0; x < W; x++) {
      stack.push(x, 0)
      stack.push(x, H - 1)
    }
    for (let y = 0; y < H; y++) {
      stack.push(0, y)
      stack.push(W - 1, y)
    }

    let cleared = 0
    while (stack.length) {
      const y = stack.pop()
      const x = stack.pop()
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const idx = y * W + x
      if (seen[idx]) continue
      seen[idx] = 1
      const p = idx * C
      const d = dist([data[p], data[p + 1], data[p + 2]], bg)
      if (d > TOL + SOFT) continue
      if (d <= TOL) {
        data[p + 3] = 0
        cleared++
      } else {
        data[p + 3] = Math.round((255 * (d - TOL)) / SOFT)
      }
      stack.push(x + 1, y)
      stack.push(x - 1, y)
      stack.push(x, y + 1)
      stack.push(x, y - 1)
    }
    const ratio = cleared / (W * H)

    // How much of the frame the product still occupies once the flood has run. This
    // is the check that catches a pale garment on a pale sweep: the fill walks
    // straight through it and all that survives is a faint outline, so the product
    // collapses to almost nothing. Measured 2026-09-06, good results keep 0.07 to
    // 0.33 of the frame while the sand-on-off-white short that came out gutted kept
    // 0.015 and the white shirt dress 0.027.
    //
    // Judging by the COLOUR of what survives was tried first and does not work: the
    // gutted short scores 0.76 there and a white short that cuts cleanly scores
    // 0.47, so the two are the wrong way round. Do not bring that test back.
    let kept = 0
    for (let i = 0; i < W * H; i++) if (data[i * C + 3] >= 250) kept++
    const keptRatio = kept / (W * H)

    // Any leftover opaque pixel in the outer frame means the flood stopped early,
    // which happens on gradient or two-tone backgrounds.
    const m = Math.max(2, Math.round(Math.min(W, H) * 0.03))
    let frameLeft = 0
    let frameTot = 0
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x < m || y < m || x >= W - m || y >= H - m) {
          frameTot++
          if (!seen[y * W + x]) frameLeft++
        }
      }
    }
    const frameRatio = frameLeft / frameTot

    let verdict = 'cut'
    if (spread > CORNER_SPREAD) verdict = 'not-a-studio-sweep'
    else if (bg[0] + bg[1] + bg[2] < MIN_LIGHT) verdict = 'background-too-dark'
    else if (centreBg > MAX_CENTRE_BG) verdict = 'nothing-but-background'
    else if (keptRatio < MIN_KEPT) verdict = 'garment-same-colour-as-background'
    else if (ratio < MIN_CLEARED) verdict = 'cleared-too-little'
    else if (ratio > MAX_CLEARED) verdict = 'cleared-too-much'
    else if (frameRatio > 0.01) verdict = 'flood-stopped-early'

    if (debug) {
      return Response.json({
        verdict,
        bg: bg.join(','),
        spread: +spread.toFixed(1),
        centreBg: +centreBg.toFixed(3),
        kept: +keptRatio.toFixed(3),
        cleared: +ratio.toFixed(3),
        frameLeft: +frameRatio.toFixed(4),
        size: W + 'x' + H,
      })
    }
    if (verdict !== 'cut' && !force) return send(input, ctype)

    const out = await sharp(data, { raw: { width: W, height: H, channels: C } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    return send(out, 'image/png')
  } catch (e) {
    if (debug) return Response.json({ verdict: 'threw', error: String(e).slice(0, 200) })
    return send(input, ctype)
  }
}
