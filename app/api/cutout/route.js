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
  'media.arket.com',
  'eu.sandro-paris.com',
  'media.veja-store.com',
  'media.occtoo.com',
  'www.jacquemus.com',
]

const MAX = 1000 // work at this size: plenty for the site and ~6x faster than full
const TOL = 26   // colour distance that still counts as background
const SOFT = 14  // extra distance that gets a feathered alpha instead of a hard cut

// Refusal thresholds, all calibrated on real product photos 2026-09-06.
const CORNER_SPREAD = 18 // corners must agree or it is a scene, not a sweep
const MIN_LIGHT = 480    // sum of the background RGB: light backgrounds only
const MIN_CLEARED = 0.15
const MAX_FRAME_LEFT = 0.06 // leftover opaque pixels allowed in the outer border
const MIN_KEPT = 0.01   // a floor against an empty result
const MIN_FILL = 0.13   // the product must fill this much of its OWN bounding box

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
  // &flat=1 paints the background PURE WHITE instead of making it transparent, and
  // never refuses. It is the answer for the packshots the cut-out cannot handle: a
  // pale garment on a pale sweep is exactly the case where the fill walks into the
  // garment, and painting those pixels white is INVISIBLE because they were already
  // white. So every product can be normalised onto one background with no risk,
  // which is what lets the site show every piece the same way.
  const flat = searchParams.get('flat') === '1'
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

    // SOME PACKSHOTS ARE ALREADY CUT OUT. Polene ships transparent PNGs and so do a
    // few Mejuri and Shopify files. Their corners have alpha 0, which ensureAlpha
    // reports as RGB 0,0,0, so the light-background test used to reject them as
    // 'background-too-dark' and the site left them in a white box for nothing.
    // Nothing needs cutting here, only measuring.
    const cornerAlpha = [at(2, 2), at(W - 3, 2), at(2, H - 3), at(W - 3, H - 3)].map(
      (i) => data[i + 3]
    )
    const alreadyCut = C === 4 && cornerAlpha.every((a) => a < 8)

    // How much of the MIDDLE of the frame is already background-coloured. Reported
    // for diagnosis only, NOT used to decide any more. It was a criterion for a few
    // hours on 2026-09-06 and it was wrong: it cannot separate a pale garment from a
    // thin one, so it refused espadrilles, sneakers, sandals and necklaces, whose
    // centre is genuinely empty. A flat sandal that cuts perfectly scores 0.71 and a
    // pale short that cuts badly scores 0.77. `fill` is the criterion.
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
    // An already-transparent file needs no fill: seed nothing and let the pass below
    // simply measure the alpha that is already there.
    if (!alreadyCut) {
    for (let x = 0; x < W; x++) {
      stack.push(x, 0)
      stack.push(x, H - 1)
    }
    for (let y = 0; y < H; y++) {
      stack.push(0, y)
      stack.push(W - 1, y)
    }
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
    // collapses to almost nothing.
    //
    // WHAT IT IS MEASURED AGAINST MATTERS. The first version compared the survivor
    // to the whole FRAME, and that quietly refused every SMALL product: a pair of
    // ballet flats or a flat sandal occupies very little of its frame and scored the
    // same as a gutted dress. Giulio spotted it on the live homepage. The honest
    // question is how densely the product fills its OWN bounding box, which is what
    // `fill` below answers. Calibrated 2026-09-06: clean cuts run 0.18 to 0.83
    // (a white BOSS linen short is the low one at 0.18), gutted ones run 0.03 to
    // 0.08. The gap is wide and empty, so the line sits in the middle of it.
    //
    // Judging by the COLOUR of what survives was tried first and does not work: the
    // gutted short scores 0.76 there and a white short that cuts cleanly scores
    // 0.47, so the two are the wrong way round. Do not bring that test back.
    let kept = 0
    let top = H
    let bottom = 0
    let left = W
    let right = 0
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * C + 3] < 250) continue
        kept++
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
    const keptRatio = kept / (W * H)

    // The alpha bounding box, as the fractions the site and the pin renderer both
    // take as cutbox. Removing the background does not crop the canvas, so without
    // this a cut-out garment stays wherever the brand happened to place it in its
    // own frame and a row of three pieces looks like it is drifting.
    // How densely the product fills its own bounding box. This is what separates a
    // SMALL product from a GUTTED one, and the frame-fraction alone could not: a pair
    // of ballet flats is tiny in its frame but solid inside its box, while a pale
    // short that the fill walked through leaves a big box with almost nothing in it.
    const boxArea = kept ? (bottom - top + 1) * (right - left + 1) : 0
    const fill = boxArea ? kept / boxArea : 0

    const box = kept
      ? [
          (W / H).toFixed(4),
          (top / H).toFixed(4),
          ((bottom + 1) / H).toFixed(4),
          (left / W).toFixed(4),
          ((right + 1) / W).toFixed(4),
        ].join(',')
      : null

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

    let verdict = flat ? 'flattened' : 'cut'
    if (flat) {
      // nothing to judge: painting white over white cannot damage anything
    } else if (alreadyCut) verdict = keptRatio > 0.005 ? 'already-transparent' : 'empty'
    else if (spread > CORNER_SPREAD) verdict = 'not-a-studio-sweep'
    else if (bg[0] + bg[1] + bg[2] < MIN_LIGHT) verdict = 'background-too-dark'
    else if (keptRatio < MIN_KEPT || fill < MIN_FILL)
      verdict = 'garment-same-colour-as-background'
    else if (ratio < MIN_CLEARED) verdict = 'cleared-too-little'
    else if (frameRatio > MAX_FRAME_LEFT) verdict = 'flood-stopped-early'

    if (debug) {
      return Response.json({
        verdict,
        bg: bg.join(','),
        spread: +spread.toFixed(1),
        centreBg: +centreBg.toFixed(3),
        kept: +keptRatio.toFixed(3),
        fill: +fill.toFixed(3),
        box,
        cleared: +ratio.toFixed(3),
        frameLeft: +frameRatio.toFixed(4),
        size: W + 'x' + H,
      }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }
    // Already transparent: the original file IS the cut-out, so hand it back as it
    // came rather than re-encoding it. Only the box was needed.
    if (verdict === 'already-transparent') return send(input, ctype)
    if (verdict !== 'cut' && verdict !== 'flattened' && !force) return send(input, ctype)

    // In flat mode the transparency is composited back onto pure white. The measuring
    // above is identical, so the box is still the CONTENT box and the piece is still
    // optically centred; only the delivery differs.
    let pipe = sharp(data, { raw: { width: W, height: H, channels: C } })
    if (flat) pipe = pipe.flatten({ background: '#FFFFFF' })
    const out = await pipe.png({ compressionLevel: 9 }).toBuffer()
    return send(out, 'image/png')
  } catch (e) {
    if (debug)
      return Response.json(
        { verdict: 'threw', error: String(e).slice(0, 200) },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    return send(input, ctype)
  }
}
