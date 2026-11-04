// Copied by scripts/cf-build.mjs to app/pin/[file]/route.js on Cloudflare only.
// Renders the split Pinterest pin of every recent look as a static PNG at build
// time, with the same code as the Vercel /api/pin route. URL: /pin/<slug>.png
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { supabase } from '@/lib/supabase'
import { GET as pinGET } from '@/lib/cf/pin-route'
import { GET as cutoutGET } from '@/lib/cf/cutout-route'

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  const since = new Date(Date.now() - 10 * 864e5).toISOString()
  const { data } = await supabase
    .from('outfits')
    .select('slug')
    .eq('status', 'active')
    .not('model_image_url', 'is', null)
    .gte('created_at', since)
  const r = (data || []).map((o) => ({ file: o.slug + '.png' }))
  return r.length ? r : [{ file: '__none.png' }]
}

const realFetch = globalThis.fetch
async function shimFetch(input, init) {
  const url = typeof input === 'string' ? input : input && input.url ? input.url : String(input)
  if (url.startsWith('http://cf.local/_next/image')) {
    const q = new URL(url).searchParams
    const r = await realFetch(q.get('url'))
    const buf = Buffer.from(await r.arrayBuffer())
    const out = await sharp(buf).resize({ width: Number(q.get('w')) || 1200, withoutEnlargement: true }).png().toBuffer()
    return new Response(out, { headers: { 'content-type': 'image/png' } })
  }
  if (url.startsWith('http://cf.local/api/cutout')) {
    const p = url.slice('http://cf.local'.length)
    const key = crypto.createHash('sha1').update(p).digest('hex').slice(0, 20)
    const f = path.join(process.cwd(), 'public', 'cutouts', key + '.webp')
    if (fs.existsSync(f)) {
      const out = await sharp(fs.readFileSync(f)).png().toBuffer()
      return new Response(out, { headers: { 'content-type': 'image/png' } })
    }
    return cutoutGET(new Request(url))
  }
  return realFetch(input, init)
}

export async function GET(req, { params }) {
  const { file } = await params
  const slug = file.replace(/\.png$/, '')
  if (slug === '__none') return new Response('none')
  try {
    const { data: o } = await supabase.from('outfits').select('model_image_url').eq('slug', slug).single()
    if (!o || !o.model_image_url) return new Response('no model photo')
    globalThis.fetch = shimFetch
    const res = await pinGET(
      new Request('http://cf.local/api/pin/' + slug + '?format=split&img=' + encodeURIComponent(o.model_image_url)),
      { params: Promise.resolve({ slug }) }
    )
    const buf = await res.arrayBuffer()
    if (!res.ok) return new Response('pin failed: ' + res.status)
    return new Response(buf, { headers: { 'content-type': 'image/png' } })
  } catch (e) {
    return new Response('pin error: ' + e.message)
  } finally {
    globalThis.fetch = realFetch
  }
}
