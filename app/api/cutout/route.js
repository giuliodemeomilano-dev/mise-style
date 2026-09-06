import sharp from 'sharp'

export const runtime = 'nodejs'

// Free background remover for flat studio packshots. No AI, no credits: the brands
// shoot on a near-uniform light sweep, so a colour flood from the borders lifts it.
//
// IT REFUSES RATHER THAN RUINS. A pale garment on a pale sweep is the case that
// breaks the technique, and a dress with a hole in it is far worse than a visible
// box on a site where someone is deciding whether to buy. Every result is measured
// and anything suspicious returns the ORIGINAL image untouched.
//
// &debug=1 returns the measurements as JSON. &flat=<rrggbb> composites onto a
// colour instead of transparency and never refuses. &force=1 cuts regardless.

const ALLOWED = [
  'media.cos.com',
  'static.massimodutti.net',
  'cdn.shopify.com',
  'images.hugoboss.com',
  'mejuri.com',
  'eu.sunspel.com',
  'd8j0ntlcm91z4.cloudfront.net',
  'media.arket.com',
  'eu.sandro-paris.com',
  'media.veja-store.com',
  'media.occtoo.com',
  'www.jacquemus.com',
]

const MAX = 1000
const SOFT = 10        // feathered band above the tolerance
const MIN_LIGHT = 480  // sum of the background RGB: light sweeps only
const MIN_CLEARED = 0.15
const MIN_KEPT = 0.01
const MIN_FILL = 0.13  // the product must fill this much of its OWN bounding box
const VIVID_D = 60
const MIN_VIVID = 0.70 // ...or nearly all of it must be unmistakably not background
const MAX_FRAME_LEFT = 0.02

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
  const force = searchParams.get('force') === '1'
  const flatParam = searchParams.get('flat')
  const flat = Boolean(flatParam)
  const flatColor =
    flatParam && /^[0-9a-fA-F]{6}$/.test(flatParam) ? '#' + flatParam : '#FFFFFF'
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
  const json = (o) =>
    Response.json(o, { headers: { 'Access-Control-Allow-Origin': '*' } })

  try {
    const { data, info } = await sharp(input)
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const W = info.width
    const H = info.height
    const C = info.channels
    const N = W * H
    const at = (x, y) => (y * W + x) * C
    const px = (x, y) => [data[at(x, y)], data[at(x, y) + 1], data[at(x, y) + 2]]
    const cs = [px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)]
    const bg = [0, 1, 2].map((i) =>
      Math.round(cs.reduce((s, c) => s + c[i], 0) / cs.length)
    )
    const spread = Math.max(...cs.map((c) => dist(c, bg)))

    const cornerAlpha = [at(2, 2), at(W - 3, 2), at(2, H - 3), at(W - 3, H - 3)].map(
      (i) => data[i + 3]
    )
    const alreadyCut = C === 4 && cornerAlpha.every((a) => a < 8)

    // Precompute each pixel's distance from the background once. Every tolerance in
    // the ladder below reads this instead of recomputing a square root per pass.
    const dd = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const p = i * C
      dd[i] = dist([data[p], data[p + 1], data[p + 2]], bg)
    }

    const m = Math.max(2, Math.round(Math.min(W, H) * 0.03))
    const inFrame = (x, y) => x < m || y < m || x >= W - m || y >= H - m
    let frameTot = 0
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (inFrame(x, y)) frameTot++

    // ONE FLOOD AT A GIVEN TOLERANCE. Returns the mask and its measurements; it does
    // not touch the pixels, so the ladder can try several and keep the best.
    const flood = (tol) => {
      const seen = new Uint8Array(N)
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
        const d = dd[idx]
        if (d > tol + SOFT) continue
        if (d <= tol) cleared++
        stack.push(x + 1, y)
        stack.push(x - 1, y)
        stack.push(x, y + 1)
        stack.push(x, y - 1)
      }
      let frameLeft = 0
      let kept = 0
      let vivid = 0
      let top = H
      let bottom = 0
      let left = W
      let right = 0
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x
          const gone = seen[idx] && dd[idx] <= tol
          if (gone) continue
          if (inFrame(x, y)) frameLeft++
          if (seen[idx]) continue // feathered band: not solid product
          kept++
          if (dd[idx] > VIVID_D) vivid++
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (x < left) left = x
          if (x > right) right = x
        }
      }
      const boxArea = kept ? (bottom - top + 1) * (right - left + 1) : 0
      return {
        tol,
        seen,
        cleared: cleared / N,
        kept: kept / N,
        fill: boxArea ? kept / boxArea : 0,
        vivid: kept ? vivid / kept : 0,
        frameLeft: frameLeft / frameTot,
        box: kept
          ? [
              (W / H).toFixed(4),
              (top / H).toFixed(4),
              ((bottom + 1) / H).toFixed(4),
              (left / W).toFixed(4),
              ((right + 1) / W).toFixed(4),
            ].join(',')
          : null,
      }
    }

    // THE TOLERANCE LADDER. This is the whole trick, and it took Giulio pointing at
    // a white dress to find it. A single tolerance of 26 was eating every pale
    // garment, because Massimo Dutti shoots on grey 245 and a white garment is 255:
    // only 17 apart, well inside 26, so the fill walked straight through the dress.
    // But the sweep is UNIFORM, so it does not need a wide tolerance at all. Start
    // narrow, and widen only while the border is still not clean. The first rung
    // that clears the frame is the right one, and on a white-on-grey packshot that
    // rung is 8 or 12, which stops dead at the garment.
    const ladder = [8, 12, 18, 26, Math.max(34, Math.round(spread * 1.7))]
    const clean = (x) => x.frameLeft <= MAX_FRAME_LEFT && x.cleared >= MIN_CLEARED
    const good = (x) => x.kept >= MIN_KEPT && (x.fill >= MIN_FILL || x.vivid >= MIN_VIVID)
    let r = null
    for (const tol of ladder) {
      const x = flood(tol)
      if (!r || (clean(x) && !clean(r))) r = x
      // Take the first rung that both clears the border AND leaves a believable
      // product. A narrow tolerance saves a pale garment; a wider one is what a thin
      // chain needs, because at 8 it keeps a halo of near-background that drowns the
      // vividness. Walking the ladder serves both instead of trading one for the other.
      if (clean(x) && good(x)) {
        r = x
        break
      }
      if (clean(x) && clean(r) && x.tol > r.tol) r = x
    }

    let verdict = 'cut'
    if (flat) verdict = 'flattened'
    else if (alreadyCut) verdict = r.kept > 0.005 ? 'already-transparent' : 'empty'
    else if (spread > 60) verdict = 'not-a-studio-sweep'
    else if (bg[0] + bg[1] + bg[2] < MIN_LIGHT) verdict = 'background-too-dark'
    else if (r.cleared < MIN_CLEARED) verdict = 'cleared-too-little'
    else if (r.frameLeft > MAX_FRAME_LEFT) verdict = 'flood-stopped-early'
    else if (r.kept < MIN_KEPT || (r.fill < MIN_FILL && r.vivid < MIN_VIVID))
      verdict = 'garment-same-colour-as-background'

    if (debug) {
      return json({
        verdict,
        bg: bg.join(','),
        spread: +spread.toFixed(1),
        tol: r.tol,
        kept: +r.kept.toFixed(3),
        fill: +r.fill.toFixed(3),
        vivid: +r.vivid.toFixed(3),
        cleared: +r.cleared.toFixed(3),
        frameLeft: +r.frameLeft.toFixed(4),
        box: r.box,
        size: W + 'x' + H,
      })
    }
    if (verdict === 'already-transparent') return send(input, ctype)
    if (verdict !== 'cut' && verdict !== 'flattened' && !force) return send(input, ctype)

    // Apply the chosen mask: clear the background, feather the rim.
    for (let i = 0; i < N; i++) {
      if (!r.seen[i]) continue
      const d = dd[i]
      if (d <= r.tol) data[i * C + 3] = 0
      else data[i * C + 3] = Math.round((255 * (d - r.tol)) / SOFT)
    }

    let pipe = sharp(data, { raw: { width: W, height: H, channels: C } })
    if (flat) pipe = pipe.flatten({ background: flatColor })
    const out = await pipe.png({ compressionLevel: 9 }).toBuffer()
    return send(out, 'image/png')
  } catch (e) {
    if (debug) return json({ verdict: 'threw', error: String(e).slice(0, 200) })
    return send(input, ctype)
  }
}
