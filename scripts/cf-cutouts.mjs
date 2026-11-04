// Cloudflare build step: pre-computes every product cut-out with the same code as
// the Vercel /api/cutout route, and writes them as static files the Pages Function
// serves. public/cutouts/<key>.webp + <key>.json ({ verdict, box }).
// key = first 20 hex chars of sha1(stored cutout_url path).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const root = process.cwd()
const outDir = path.join(root, 'public', 'cutouts')
fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.join(root, 'lib', 'cf', 'cutout-route.js'), path.join(root, 'scripts', '.cutout-route.mjs'))
const { GET } = await import(path.join(root, 'scripts', '.cutout-route.mjs'))

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const keyOf = (p) => crypto.createHash('sha1').update(p).digest('hex').slice(0, 20)

const paths = new Set()
for (let from = 0; from < 20000; from += 1000) {
  const r = await fetch(`${BASE}/rest/v1/products?select=cutout_url&cutout_url=like./api/cutout*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
  })
  if (!r.ok) break
  const rows = await r.json()
  rows.forEach((x) => x.cutout_url && paths.add(x.cutout_url))
  if (rows.length < 1000) break
}
console.log('cf-cutouts:', paths.size, 'cut-outs to prepare')

const deadline = Date.now() + 9 * 60 * 1000
let done = 0, cut = 0, failed = 0
const list = [...paths]
async function one(p) {
  const key = keyOf(p)
  try {
    const res = await GET(new Request('http://cf.local' + p))
    if (!res.ok) { failed++; return }
    const buf = Buffer.from(await res.arrayBuffer())
    const img = sharp(buf)
    const meta = await img.metadata()
    let verdict = 'refuse', box = null
    if (meta.hasAlpha) {
      const { info } = await sharp(buf).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
      const W = meta.width, H = meta.height
      const t = -(info.trimOffsetTop || 0), l = -(info.trimOffsetLeft || 0)
      const f = (n) => Number(n).toFixed(4)
      box = [f(W / H), f(t / H), f((t + info.height) / H), f(l / W), f((l + info.width) / W)].join(',')
      verdict = 'cut'
      cut++
    }
    await sharp(buf).webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(outDir, key + '.webp'))
    fs.writeFileSync(path.join(outDir, key + '.json'), JSON.stringify({ verdict, box }))
    done++
  } catch (e) {
    failed++
  }
}
let i = 0
async function worker() {
  while (i < list.length && Date.now() < deadline) await one(list[i++])
}
await Promise.all(Array.from({ length: 6 }, worker))
console.log(`cf-cutouts: ${done} written (${cut} with transparency), ${failed} failed, ${list.length - i} skipped for time`)
