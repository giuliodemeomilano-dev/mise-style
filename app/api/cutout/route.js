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
const MIN_KEPT = 0.002  // a floor against an empty result
const INK_D = 12        // anything this far from the background is arguably product
const MIN_SURVIVAL = 0.10 // ...and a tenth of it has to survive the fill.
// A tenth, not a half: the ink threshold is low enough to count the soft drop shadow a
// studio leaves around a garment, and a wide tolerance legitimately clears that
// shadow. Measured 2026-09-07: a green COS polo that cuts perfectly survives 0.46
// while a gutted ivory dress survives 0.008. The gap is three orders of magnitude.
const MIN_FILL = 0.13  // the product must fill this much of its OWN bounding box
const VIVID_D = 60
const MIN_VIVID = 0.70 // ...or nearly all of it must be unmistakably not background
const MAX_FRAME_LEFT = 0.02
const LOCAL_STEP = 3    // how far the background may drift from ONE pixel to the next.
// 3, calibrated 2026-09-07 against the Massimo Dutti ivory dress Giulio kept
// pointing at. A studio gradient moves about 1 per pixel, so 3 crosses it easily,
// while the anti-aliased edge of a pale garment moves 6 or more and stops the fill
// dead. At 8 the fill crept through that edge and ate the dress; at 3 the dress
// keeps 96.5% of itself and lands on the cream.
const GLOBAL_CAP = 70   // ...and how far it may drift in total before it is product

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
  const lsParam = Number(searchParams.get('ls'))
  const localStep = Number.isFinite(lsParam) && lsParam > 0 ? lsParam : LOCAL_STEP
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

    // INK = every pixel even slightly different from the background, measured ONCE at
    // a fixed low threshold and independent of any tolerance. It is the honest
    // estimate of how much product is in the photo. Comparing what survives the fill
    // against it answers the only question that matters, "did the fill eat the
    // garment", and it answers it for a fine chain and a pale dress with one number:
    // the chain keeps essentially all of its ink, the dress keeps 2% of its own.
    let ink = 0
    for (let i = 0; i < N; i++) if (dd[i] > INK_D) ink++

    const m = Math.max(2, Math.round(Math.min(W, H) * 0.03))
    const inFrame = (x, y) => x < m || y < m || x >= W - m || y >= H - m
    let frameTot = 0
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (inFrame(x, y)) frameTot++

    // ONE FLOOD AT A GIVEN TOLERANCE. Returns the mask and its measurements; it does
    // not touch the pixels, so the ladder can try several and keep the best.
    // THE FLOOD FOLLOWS THE GRADIENT, IT DOES NOT JUST THRESHOLD.
    // A studio sweep is rarely one flat colour: COS lights a soft glow behind the
    // product, so the corners read 221 while the middle drifts to 240. Comparing
    // every pixel to the corner colour forced the tolerance up to 34 to cross that
    // drift, and 34 is exactly the distance from COS grey to a WHITE ballet flat, so
    // the shoe was eaten by the gradient rather than by its own colour. Giulio spotted
    // it and was right that the background is grey, not white.
    //
    // So a pixel joins the background if it is close to the corner colour OR if it is
    // within one small step of the neighbour that reached it and has not drifted too
    // far in total. A smooth gradient is a thousand small steps; the edge of a shoe is
    // one big one.
    const stepDist = (a, b) => {
      const pa = a * C
      const pb = b * C
      return dist(
        [data[pa], data[pa + 1], data[pa + 2]],
        [data[pb], data[pb + 1], data[pb + 2]]
      )
    }
    const flood = (tol) => {
      const seen = new Uint8Array(N)
      const from = new Int32Array(N).fill(-1)
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
        const d = dd[idx]
        const f = from[idx]
        const near = d <= tol
        const smooth =
          f >= 0 && d <= GLOBAL_CAP && stepDist(idx, f) <= localStep
        if (!near && !smooth) {
          // Just outside: mark it as the feathered rim but do not expand through it.
          if (d <= tol + SOFT) seen[idx] = 2
          continue
        }
        seen[idx] = 1
        cleared++
        const push = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) return
          const n = ny * W + nx
          if (seen[n]) return
          if (from[n] < 0) from[n] = idx
          stack.push(nx, ny)
        }
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)
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
          if (seen[idx] === 1) continue // background
          // Only BACKGROUND the flood failed to reach counts as stopping early. A pair
          // of trousers that runs to the bottom of its frame is product, not failure,
          // and counting it was refusing perfect cut-outs: measured 2026-09-07, six
          // navy and olive trousers scored survival 0.99 and fill 0.85 and were thrown
          // out for having their own hems inside the border band.
          if (inFrame(x, y) && dd[idx] <= tol) frameLeft++
          if (seen[idx] === 2) continue // feathered rim, not solid product
          kept++
          if (dd[idx] > VIVID_D) vivid++
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (x < left) left = x
          if (x > right) right = x
        }
      }
      const boxArea = kept ? (bottom - top + 1) * (right - left + 1) : 0
      const survival = ink ? kept / ink : 0
      return {
        tol,
        seen,
        cleared: cleared / N,
        kept: kept / N,
        fill: boxArea ? kept / boxArea : 0,
        survival,
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
    const good = (x) =>
      x.kept >= MIN_KEPT &&
      x.survival >= MIN_SURVIVAL &&
      (x.fill >= MIN_FILL || x.vivid >= MIN_VIVID)
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
    if (alreadyCut) verdict = r.kept > 0.005 ? 'already-transparent' : 'empty'
    else if (spread > 60) verdict = 'not-a-studio-sweep'
    else if (bg[0] + bg[1] + bg[2] < MIN_LIGHT) verdict = 'background-too-dark'
    else if (r.cleared < MIN_CLEARED) verdict = 'cleared-too-little'
    else if (r.frameLeft > MAX_FRAME_LEFT) verdict = 'flood-stopped-early'
    else if (
      r.kept < MIN_KEPT ||
      r.survival < MIN_SURVIVAL ||
      (r.fill < MIN_FILL && r.vivid < MIN_VIVID)
    )
      verdict = 'garment-same-colour-as-background'

    if (debug) {
      return json({
        verdict,
        bg: bg.join(','),
        spread: +spread.toFixed(1),
        tol: r.tol,
        kept: +r.kept.toFixed(3),
        fill: +r.fill.toFixed(3),
        survival: +r.survival.toFixed(3),
        ink: +(ink / N).toFixed(4),
        vivid: +r.vivid.toFixed(3),
        cleared: +r.cleared.toFixed(3),
        frameLeft: +r.frameLeft.toFixed(4),
        box: r.box,
        size: W + 'x' + H,
      })
    }
    if (verdict === 'already-transparent') return send(input, ctype)
    // A REFUSAL RETURNS THE ORIGINAL, INCLUDING IN FLAT MODE. flat=1 was briefly
    // allowed to skip the judgement on the theory that painting white over a white
    // background could not hurt. It could: an IVORY dress on grey 244 is not white,
    // and flattening the eaten result onto pure white erased the dress almost
    // completely. Giulio caught it on the live homepage. Flatten only what the
    // checks trust; hand back the untouched photo for everything else.
    if (verdict !== 'cut' && !force) return send(input, ctype)

    // Apply the chosen mask: clear the background, feather the rim.
    for (let i = 0; i < N; i++) {
      const s = r.seen[i]
      if (s === 1) data[i * C + 3] = 0
      else if (s === 2) {
        const a = Math.round((255 * (dd[i] - r.tol)) / SOFT)
        data[i * C + 3] = Math.max(0, Math.min(255, a))
      }
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
