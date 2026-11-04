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

// 0b. Every other API route becomes a Cloudflare Pages Function (see buildFunctions).
buildFunctions()

// 1. Server-only routes out of the static build.
for (const dir of ['api', 'go']) {
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

// 7b. Point the pages straight at the static cut-out files. Saves a Function call
// per image and gives the images new URLs, so browsers that cached the first
// (redirecting) version of /api/cutout get the transparent files.
{
  const crypto = await import('node:crypto')
  const outRoot = path.join(root, 'out')
  const keyOf = (p) => crypto.createHash('sha1').update(p).digest('hex').slice(0, 20)
  const files = []
  const walkOut = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name)
      if (e.isDirectory()) { if (e.name !== 'cutouts' && e.name !== '_next') walkOut(f) }
      else if (/\.(html|txt)$/.test(e.name)) files.push(f)
    }
  }
  walkOut(outRoot)
  let swapped = 0
  for (const f of files) {
    const s0 = fs.readFileSync(f, 'utf8')
    const s1 = s0.replace(/\/api\/cutout\?[^"'\\\s<>)]+/g, (m) => {
      const stored = m.replace(/&amp;/g, '&')
      const k = keyOf(stored)
      if (fs.existsSync(path.join(outRoot, 'cutouts', k + '.webp'))) { swapped++; return '/cutouts/' + k + '.webp' }
      return m
    })
    if (s1 !== s0) fs.writeFileSync(f, s1)
  }
  console.log('cf-build: ' + swapped + ' cut-out links pointed at static files')
}

// 8. Cloudflare Pages extras.
const out = path.join(root, 'out')
fs.writeFileSync(
  path.join(out, '_headers'),
  `/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/pin/*
  Content-Type: image/png
  Cache-Control: public, max-age=3600
/cutouts/*
  Cache-Control: public, max-age=604800
`
)
console.log('cf-build: done')

// Copies app/api/**/route.js (except cutout and pin, handled above) and lib/ into
// cfsrc/, rewriting the Next-only imports, and writes one thin Pages Function per
// route into functions/api/. Wrangler bundles them after this script ends.
function buildFunctions() {
  const src = path.join(root, 'cfsrc')
  fs.rmSync(src, { recursive: true, force: true })
  fs.mkdirSync(path.join(src, 'shims'), { recursive: true })
  fs.writeFileSync(path.join(src, 'shims', 'next-server.js'), `export class NextResponse extends Response {
  static json(body, init) { return Response.json(body, init) }
  static redirect(url, init) {
    const status = typeof init === 'number' ? init : (init && init.status) || 307
    return new Response(null, { status, headers: { Location: String(url) } })
  }
  static next() { return new Response(null) }
}
`)
  fs.writeFileSync(path.join(src, 'shims', 'next-cache.js'), `export function unstable_cache(fn) {
  let p = null, t = 0
  return (...a) => {
    if (!p || Date.now() - t > 600000) { t = Date.now(); p = fn(...a).catch((e) => { p = null; throw e }) }
    return p
  }
}
export function revalidatePath() {}
export function revalidateTag() {}
`)
  fs.writeFileSync(path.join(src, 'run.js'), `export async function run(ctx, load) {
  if (!globalThis.process) globalThis.process = { env: {} }
  if (!globalThis.process.env) globalThis.process.env = {}
  for (const [k, v] of Object.entries(ctx.env || {})) if (typeof v === 'string') globalThis.process.env[k] = v
  const m = await load()
  const h = m[ctx.request.method]
  if (!h) return new Response('Method not allowed', { status: 405 })
  return h(ctx.request, { params: Promise.resolve(ctx.params || {}) })
}
`)
  const rewrite = (code, fileDir) =>
    code
      .replace(/from ['"]@\/lib\/([^'"]+)['"]/g, (m, mod) => `from '${path.relative(fileDir, path.join(src, 'lib', mod)).replace(/\\/g, '/').replace(/^(?!\.)/, './')}.js'`.replace(/\.js\.js'$/, ".js'"))
      .replace(/from ['"]next\/server['"]/g, () => `from '${path.relative(fileDir, path.join(src, 'shims', 'next-server.js')).replace(/\\/g, '/')}'`)
      .replace(/from ['"]next\/cache['"]/g, () => `from '${path.relative(fileDir, path.join(src, 'shims', 'next-cache.js')).replace(/\\/g, '/')}'`)
  // lib/
  for (const f of fs.readdirSync(path.join(root, 'lib'))) {
    if (!/\.js$/.test(f)) continue
    const out = path.join(src, 'lib', f)
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, rewrite(fs.readFileSync(path.join(root, 'lib', f), 'utf8'), path.dirname(out)))
  }
  // routes
  const routes = []
  const walkApi = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walkApi(path.join(dir, e.name), rel ? rel + '/' + e.name : e.name)
      else if (e.name === 'route.js') routes.push(rel)
    }
  }
  walkApi(path.join(app, 'api'), '')
  let n = 0
  for (const r of routes) {
    if (/^(cutout|pin)(\/|$)/.test(r)) continue
    const out = path.join(src, 'api', r, 'route.js')
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, rewrite(fs.readFileSync(path.join(app, 'api', r, 'route.js'), 'utf8'), path.dirname(out)))
    const fn = path.join(root, 'functions', 'api', r + '.js')
    fs.mkdirSync(path.dirname(fn), { recursive: true })
    const rel = (to) => path.relative(path.dirname(fn), to).replace(/\\/g, '/')
    fs.writeFileSync(fn, `// Generated by scripts/cf-build.mjs: runs app/api/${r}/route.js on Cloudflare.
import { run } from '${rel(path.join(src, 'run.js'))}'
export function onRequest(ctx) {
  return run(ctx, () => import('${rel(out)}'))
}
`)
    n++
  }
  console.log('cf-build: ' + n + ' API routes as Pages Functions')
}
