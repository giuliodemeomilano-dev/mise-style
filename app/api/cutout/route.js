import sharp from 'sharp'

export const runtime = 'nodejs'

// Free background remover for flat studio packshots.
//
// The brands ship on near-uniform light backgrounds (measured 2026-09-06: Massimo
// Dutti 246, Ancient Greek Sandals 255, Mejuri 248, Castaner 232), so a colour
// flood from the borders lifts them with no AI and no credits. This exists for the
// ~660 products with no paid cut-out, so they can still sit on the MISE cream.
//
// IT REFUSES RATHER THAN RUINS. A pale garment on a white background is the case
// that breaks this technique: the fill can walk straight into the dress. Every
// result is therefore sanity-checked, and anything suspicious returns the ORIGINAL
// image untouched. A visible grey box is a far smaller sin than a dress with a
// hole in it, on a site where people are deciding whether to buy the thing.

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
    const corner = (x, y) => [data[at(x, y)], data[at(x, y) + 1], data[at(x, y) + 2]]
    const cs = [corner(2, 2), corner(W - 3, 2), corner(2, H - 3), corner(W - 3, H - 3)]
    const bg = [0, 1, 2].map((i) =>
      Math.round(cs.reduce((s, c) => s + c[i], 0) / cs.length)
    )

    // The four corners must agree. If they do not, this is a scene or a gradient,
    // not a studio sweep, and the technique does not apply.
    if (Math.max(...cs.map((c) => dist(c, bg))) > 18) return send(input, ctype)
    // Light backgrounds only.
    if (bg[0] + bg[1] + bg[2] < 600) return send(input, ctype)

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

    // A real packshot leaves roughly a fifth to nine tenths of the frame as
    // background. Outside that range the fill either did nothing or escaped into
    // the garment, so hand back the original rather than guess.
    const ratio = cleared / (W * H)
    if (ratio < 0.15 || ratio > 0.92) return send(input, ctype)

    const out = await sharp(data, { raw: { width: W, height: H, channels: C } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    return send(out, 'image/png')
  } catch (e) {
    return send(input, ctype)
  }
}
