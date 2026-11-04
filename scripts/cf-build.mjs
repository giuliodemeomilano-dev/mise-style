// Cloudflare Pages build: turns the Vercel app into a static export.
// Runs only on Cloudflare (build command: `npm install && node scripts/cf-build.mjs`).
// The Vercel build is untouched: this script edits the working copy of the
// Cloudflare builder, never the repository.
//
// What changes on Cloudflare:
// - every page is pre-rendered at build time (no ISR, no server)
// - /go/<id> and /api/cutout become Pages Functions (see /functions)
// - cut-outs are pre-computed (scripts/cf-cutouts.mjs) and pins are rendered as
//   static PNGs at /pin/<slug>.png (scripts/cf-pin-route.js)
// - API routes for admin, Pinterest, swaps etc. are not deployed
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const app = path.join(root, 'app')

// 0. Keep the cut-out and pin renderers: they run at build time (see 6 and 7).
fs.mkdirSync(path.join(root, 'lib', 'cf'), { recursive: true })
fs.copyFileSync(path.join(app, 'api', 'cutout', 'route.js'), path.join(root, 'lib', 'cf', 'cutout-route.js'))
fs.copyFileSync(path.join(app, 'api', 'pin', '[slug]', 'route.js'), path.join(root, 'lib', 'cf', 'pin-route.js'))

// 1. Server-only routes out of the static build.
for (const dir of ['api', 'go', 'admin']) {
  fs.rmSync(path.join(app, dir), { recursive: true, force: true })
}

// 2. Walk the remaining app files and make them export-friendly.
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    if (f.isDirectory()) walk(p, out)
    else if (/\.(js|jsx|mjs)$/.test(f.name)) out.push(p)
  }
  return out
}
for (const file of walk(app)) {
  let s = fs.readFileSync(file, 'utf8')
  const before = s
  s = s.replace(/^export const revalidate = .*$/gm, '')
  s = s.replace(/^export const dynamic = .*$/gm, '')
  s = s.replace(
    /import \{ supabaseAdmin \} from '@\/lib\/supabase-admin'/g,
    "import { supabase as supabaseAdmin } from '@/lib/supabase'"
  )
  if (/\[[^\]]+\][\\/]page\.jsx?$/.test(file)) {
    s = s.replace(/^export const dynamicParams = .*$/gm, '')
    s += '\nexport const dynamicParams = false\n'
  }
  if (/app[\\/](sitemap|robots)\.js$/.test(file)) {
    s += "\nexport const dynamic = 'force-static'\n"
  }
  if (s !== before) fs.writeFileSync(file, s)
}

// 3. Dynamic pages that had no generateStaticParams.
const addParams = {
  'look/[slug]/page.js': `
export async function generateStaticParams() {
  const out = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase.from('outfits').select('slug').eq('status', 'active').range(from, from + 999)
    if (!data || !data.length) break
    out.push(...data.map((o) => ({ slug: o.slug })))
    if (data.length < 1000) break
  }
  return out
}
`,
  'journal/[slug]/page.js': `
export async function generateStaticParams() {
  const { data } = await supabaseAdmin.from('guides').select('slug').eq('status', 'active')
  return (data || []).map((g) => ({ slug: g.slug }))
}
`,
}
for (const [rel, code] of Object.entries(addParams)) {
  const f = path.join(app, rel)
  if (fs.existsSync(f) && !/generateStaticParams/.test(fs.readFileSync(f, 'utf8'))) {
    fs.appendFileSync(f, code)
  }
}
// An empty list fails the export, so every dynamic page gets at least a dummy
// slug (it renders the 404 page).
for (const file of walk(app).filter((f) => /\[slug\][\\/]page\.jsx?$/.test(f))) {
  let s = fs.readFileSync(file, 'utf8')
  if (!/function generateStaticParams/.test(s)) continue
  s = s.replace(/export (async )?function generateStaticParams\(/, 'async function __gsp(')
  s += "\nexport async function generateStaticParams() { const r = await __gsp(); return r && r.length ? r : [{ slug: '__none' }] }\n"
  fs.writeFileSync(file, s)
}

// 4. unstable_cache needs the Next server; memoise in-process instead so each
// build worker reads the catalogue once.
const cat = path.join(root, 'lib', 'catalog.js')
if (fs.existsSync(cat)) {
  let s = fs.readFileSync(cat, 'utf8')
  s = s.replace(/unstable_cache\((\w+),[^)]*\)/g, (m, fn) => `__memo(${fn})`)
  s += '\nfunction __memo(fn) { let p; return () => p || (p = fn()) }\n'
  fs.writeFileSync(cat, s)
}

// 5. Static export config.
fs.writeFileSync(
  path.join(root, 'next.config.mjs'),
  `/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  images: { unoptimized: true },
}
`
)

// 6. Cut-outs, pre-computed into public/cutouts and served by functions/api/cutout.js.
try {
  execSync('node scripts/cf-cutouts.mjs', { stdio: 'inherit' })
} catch (e) {
  console.log('cf-cutouts failed, the site falls back to packshots:', e.message)
}

// 7. Pinterest pins as static PNGs: /pin/<slug>.png for the looks of the last 10 days.
fs.mkdirSync(path.join(app, 'pin', '[file]'), { recursive: true })
fs.copyFileSync(path.join(root, 'scripts', 'cf-pin-route.js'), path.join(app, 'pin', '[file]', 'route.js'))

execSync('npx next build', { stdio: 'inherit' })

// 8. Cloudflare Pages extras.
const out = path.join(root, 'out')
fs.writeFileSync(
  path.join(out, '_headers'),
  `/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/pin/*
  Content-Type: image/png
  Cache-Control: public, max-age=3600
`
)
console.log('cf-build: done')
