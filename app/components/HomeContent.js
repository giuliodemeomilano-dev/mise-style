'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from './LangProvider'
import { useSaved } from '@/lib/useSaved'
import EmailSignup from './EmailSignup'
import { storeName } from '@/lib/store-name'
import { eur } from '@/lib/price'

// Only brands that are really on the site today. Veja and Jacquemus were dropped
// from the roster, ARKET has no usable images (Giulio, 2026-10-15).
const BRANDS = ['COS', 'Sandro', 'Massimo Dutti', 'Sunspel', 'BOSS', 'Polène', 'Mejuri', 'Castañer', 'The Frankie Shop', 'Ancient Greek Sandals']


// The cut-outs keep the brand's original canvas, so the garment sits wherever the
// brand happened to place it. cutout_box is its measured alpha bounding box,
// "ar,top,bottom,left,right" as fractions. This centres the garment in the cell and
// scales it to a constant share of the box, which is what makes a row of pieces
// look aligned instead of drifting. Falls back to plain contain when absent.
// bottomAt, when given, parks the BOTTOM of the content at that fraction of the cell
// instead of centring it. The figure needs that: the carousel dots live over the last
// 8% of the card and were sitting on top of the shoes.
function cutFit(box, fill = 0.78, bottomAt, even) {
  if (!box) return undefined
  const p = String(box).split(',').map(Number)
  if (p.length !== 5 || p.some((n) => !Number.isFinite(n))) return undefined
  const [ar, top, bottom, left, right] = p
  const cw = right - left
  const ch = bottom - top
  if (!(ar > 0 && cw > 0 && ch > 0)) return undefined
  // Inside the card carousel every garment should read the SAME SIZE, because you see
  // one piece per slide and nothing to compare it against. Giulio asked for this on
  // 2026-09-07: a short polo sized to fit a square looked tiny next to a long shirt.
  // So when `even` is set, apparel is sized by HEIGHT and only capped on width.
  // Shoes, bags and jewelry are much wider than they are tall, and blowing those up to
  // a shirt's height looks absurd, so they keep the old fit-inside-a-square rule.
  const shape = (cw * ar) / ch
  const w =
    even && shape < 1.4
      ? Math.min((0.74 * ar) / ch, 0.9 / cw)
      : Math.min(fill / cw, (fill * ar) / ch)
  const h = w / ar
  return {
    position: 'absolute',
    width: `${(w * 100).toFixed(3)}%`,
    height: 'auto',
    padding: 0,
    objectFit: 'fill',
    left: `${((0.5 - ((left + right) / 2) * w) * 100).toFixed(3)}%`,
    top: `${((typeof bottomAt === 'number' ? bottomAt - bottom * h : 0.5 - ((top + bottom) / 2) * h) * 100).toFixed(3)}%`,
  }
}

if (typeof window !== 'undefined' && !window.__misePopHooked) {
  window.__misePopHooked = true
  window.addEventListener('popstate', () => { window.__misePop = Date.now() })
}

export default function HomeContent({ looks }) {
  const { t } = useLang()
  const [filter, setFilter] = useState('all')
  const [gender, setGenderState] = useState('women')
  // Women/Men choice lives in the URL (?g=men) and in sessionStorage, so going back from a look
  // returns to the same tab instead of resetting to Women.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('g')
      const s = window.sessionStorage.getItem('mise-gender')
      const g = q === 'men' || q === 'women' ? q : s === 'men' ? 'men' : null
      if (g === 'men') setGenderState('men')
      // coming back from a look: put the page back where it was
      const y = Number(window.sessionStorage.getItem('mise-home-y') || 0)
      const back = window.__misePop && Date.now() - window.__misePop < 3000
      window.sessionStorage.removeItem('mise-home-y')
      if (back && y > 0) {
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
        setTimeout(() => window.scrollTo(0, y), 350)
      }
    } catch (e) {}
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href^="/look/"]')
      if (a) { try { window.sessionStorage.setItem('mise-home-y', String(Math.round(window.scrollY))) } catch (err) {} }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  const setGender = (g) => {
    setGenderState(g)
    try {
      window.sessionStorage.setItem('mise-gender', g)
      const u = new URL(window.location.href)
      if (g === 'men') u.searchParams.set('g', 'men')
      else u.searchParams.delete('g')
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash)
    } catch (e) {}
  }
  const [view, setView] = useState('discover')
  const [budget, setBudget] = useState(null)
  const [modalLook, setModalLook] = useState(null)
  const { isSaved, toggle: toggleSaved } = useSaved()
  const [shown, setShown] = useState(12)
  useEffect(() => { setShown(12) }, [filter, gender, budget, view])

  useEffect(() => {
    const onView = (e) => setView(e.detail)
    window.addEventListener('mise-view', onView)
    return () => window.removeEventListener('mise-view', onView)
  }, [])
  const [carIdx, setCarIdx] = useState({})
  const touchStartX = useRef(null)
  const moveCar = (e, lookId, len, dir) => {
    e.preventDefault()
    e.stopPropagation()
    setCarIdx((prev) => {
      const cur = prev[lookId] || 0
      const next = (cur + dir + len) % len
      return { ...prev, [lookId]: next }
    })
  }

  const onSwipeEnd = (e, lookId, len) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    moveCar(e, lookId, len, dx < 0 ? 1 : -1)
  }

  const cats = ['all', 'weekend', 'travel', 'brunch', 'office', 'evening', 'date', 'casual']

  const byGender = looks.filter((l) => l.gender === gender)
  const byCat = filter === 'all' ? byGender : byGender.filter((l) => l.cat === filter)
  const filtered = budget == null ? byCat : byCat.filter((l) => (Number(l.total) || l.pieces.reduce((s, p) => s + (p.price || 0), 0)) <= budget)

  // Newest first, always: the homepage promises new outfits every day, so the ones
  // published this morning have to be the first thing you meet. Everything older
  // stays one tap away behind Load more, instead of 132 cards in a single scroll.
  const dayOf = (l) => String(l.created || '').slice(0, 10)
  // Inside the same day, the looks with a piece from a shop that pays us (Awin:
  // Hugo Boss, Italist, Vilebrequin) come first. Days still go newest first.
  const paid = (l) => (l.pieces.some((p) => /awin1\.com|italist\.com|vilebrequin\.com/i.test(p.url || '')) ? 1 : 0)
  const byDate = [...filtered].sort((a, b) => {
    const da = dayOf(a)
    const db = dayOf(b)
    if (da !== db) return db < da ? -1 : 1
    if (paid(b) !== paid(a)) return paid(b) - paid(a)
    return new Date(b.created || 0) - new Date(a.created || 0)
  })
  const latestDay = byDate.length ? dayOf(byDate[0]) : null
  // One line instead of a badge on every card: the badge sat on all of today's
  // looks at once, so it marked everything and told you nothing. The count is
  // read from the data, so a day the daily task does not run it tells the truth.
  const newestDay = looks.map(dayOf).filter(Boolean).sort().pop() || null
  // Counted on what is actually in the grid below, not on the whole day: the day
  // has six looks but a gender tab only ever shows three of them, so counting all
  // six over a grid of three would be a number the page cannot back up.
  const newTodayCount = newestDay ? filtered.filter((l) => dayOf(l) === newestDay).length : 0
  let ordered = byDate
  if (view === 'trending') {
    ordered = [...filtered].sort((a, b) => (b.featured || 0) - (a.featured || 0)).slice(0, 12)
  }
  const displayed = ordered.slice(0, shown)

  const openModal = (look) => {
    setModalLook(look)
    document.body.style.overflow = 'hidden'
  }
  const closeModal = () => {
    setModalLook(null)
    document.body.style.overflow = ''
  }

  // Hearts are kept in the visitor's browser and listed on /saved.
  const toggleLike = (e, slug) => {
    e.stopPropagation()
    toggleSaved(slug)
  }

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">{t.hero_eyebrow}</p>
        <h1 dangerouslySetInnerHTML={{ __html: t.hero_title_html }} />
        <p className="hero-sub">{t.hero_sub}</p>
        <div className="hero-cta">
          <a href="#looks" className="hero-btn">{t.hero_btn}</a>
        </div>
      </section>

      <div className="marquee-wrapper">
        <div className="marquee-track">
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 48 }}>
              <span className="marquee-item">{brand}</span>
              <span className="marquee-dot"> ◆ </span>
            </span>
          ))}
        </div>
      </div>

      <section className="filter-section" id="looks">
        <div className="gender-toggle">
        <button className={`gender-pill${gender === 'women' ? ' active' : ''}`} onClick={() => setGender('women')}>{t.women}</button>
        <button className={`gender-pill${gender === 'men' ? ' active' : ''}`} onClick={() => setGender('men')}>{t.men}</button>
      </div>
      <div className="filter-inner">
          <div className="filter-scroll">
            {cats.map((c) => (
              <button
                key={c}
                className={`filter-pill${c === filter ? ' active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {t.filters[c]}
              </button>
            ))}
          </div>
          <Link href="/search" className="filter-pill search-pill">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {t.search_filters || 'Search & filters'}
          </Link>
          <div className="budget-wrap">
            <span className="budget-label">{t.budget}</span>
            <input
              type="range"
              className="budget-slider"
              min="100"
              max="1500"
              value={budget ?? 1500}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <span className="budget-value">€<input type="text" inputMode="numeric" className="budget-input" title="Click to type your max budget" placeholder="max" value={budget ?? ''} onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); setBudget(raw === '' ? null : Number(raw)); }} onBlur={(e) => { const s = e.target.value.trim(); if (s === '') { setBudget(null); return; } const v = Number(s) || 100; setBudget(Math.min(1500, Math.max(100, v))); }} /></span>
          </div>
        </div>
      </section>

      <section className="looks-section">
        {newTodayCount > 0 && view !== 'trending' && (
          <p className="new-today-line">{t.new_today_line.replace('{n}', newTodayCount)}</p>
        )}
        <div className="looks-grid">
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 40 }}>
              No outfits match this filter yet. Try another category.
            </p>
          )}
          {displayed.map((look) => {
            const total = Number(look.total) || look.pieces.reduce((s, p) => s + (p.price || 0), 0)
            const storeCount = new Set(look.pieces.map((p) => storeName(p.store))).size
            // The card leads with the model photo when the outfit has one, then the
            // packshots follow as the next slides, so you see the look worn and then
            // each piece on its own.
            const slides = (look.model ? [{ src: look.model, kind: 'model', box: look.modelBox }] : []).concat(
              look.pieces.map((p) => ({ src: p.packshot || look.hero, kind: p.cut ? 'cut' : 'raw', box: p.box }))
            )
            const slideIdx = (carIdx[look.id] || 0) % slides.length
            return (
              <div key={look.id} className="look-card visible">
                <Link href={`/look/${look.slug}`} className="look-visual" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <span className="badge-ai">{t.filters[look.cat] || t.badge}</span>
                  <button
                    className={`btn-save${isSaved(look.slug) ? ' liked' : ''}`}
                    aria-label="Save this outfit"
                    onClick={(e) => { e.preventDefault(); toggleLike(e, look.slug) }}
                  >
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
              <div className="model-hero model-hero-clean car-wrap" onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }} onTouchEnd={(e) => onSwipeEnd(e, look.id, slides.length)}>
                <img src={slides[slideIdx].src} className={slides[slideIdx].kind === 'raw' ? undefined : 'is-' + slides[slideIdx].kind} style={slides[slideIdx].kind === 'model' ? cutFit(slides[slideIdx].box, 0.82, 0.88) : cutFit(slides[slideIdx].box, 0.78, undefined, true)} alt={look.title} loading="lazy" />
                {slides.length > 1 && (
                  <>
                    <button className="car-arrow car-prev" aria-label="prev" onClick={(e) => moveCar(e, look.id, slides.length, -1)}>‹</button>
                    <button className="car-arrow car-next" aria-label="next" onClick={(e) => moveCar(e, look.id, slides.length, 1)}>›</button>
                    <div className="car-dots">
                      {slides.map((_, di) => (
                        <span key={di} className={`car-dot${di === (carIdx[look.id] || 0) ? ' active' : ''}`}></span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="model-info-below">
                <div className="model-title-dark">{look.title}</div>
                <div className="model-meta-dark">{look.pieces.length} {t.pieces} · {storeCount} {t.stores} · {eur(total)}</div>
              </div>
                  <div className="pieces-strip">
                    {look.pieces.map((p, i) => (
                      <div key={i} className="strip-item">
                        <img src={p.packshot} className={p.cut ? 'is-cut' : undefined} style={cutFit(p.box, 0.78, undefined, true)} alt={p.name} loading="lazy" />
                        <div className="strip-label">
                          <div className="strip-brand">{p.brand}</div>
                          <div className="strip-price">{eur(p.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
                <div className="card-info">
                  <div className="card-tags">
                    {look.tags.map((tag, i) => (
                      <span key={i} className="card-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="card-summary">
                    <div>
                      <div className="card-total-label">{t.total_look}</div>
                      <div className="card-total-detail">{look.pieces.length} {t.pieces} · {storeCount} {t.stores}</div>
                    </div>
                    <div className="card-total-price">{eur(total)}</div>
                  </div>
                  {look.less && (
                    <Link href={`/look/${look.slug}#for-less`} className="card-for-less">
                      {(t.for_less_card || 'Or the same look for €{n}').replace('{n}', look.less.total)}
                    </Link>
                  )}
                  <button className="btn-shop" onClick={() => openModal(look)}>
                    {t.shop_btn}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {ordered.length > shown && (
          <div className="load-more-wrap">
            <button className="load-more" onClick={() => setShown((n) => n + 12)}>
              Load more outfits <span>{ordered.length - shown} left</span>
            </button>
          </div>
        )}
      </section>

      <div style={{ padding: '0 20px' }}>
        <EmailSignup source="home" />
      </div>

      <div className="bottom-spacer"></div>

      {modalLook && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal">
            <div className="modal-hero">
              <button className="modal-close" onClick={closeModal}>✕</button>
              <img src={modalLook.hero} alt={modalLook.title} />
              <div className="modal-hero-overlay">
                <div className="modal-hero-title">{modalLook.title}</div>
                <div className="modal-hero-sub">
                  {modalLook.pieces.length} {t.pieces} {t.from} {new Set(modalLook.pieces.map((p) => storeName(p.store))).size} {t.stores}
                </div>
              </div>
            </div>
            <div className="modal-body">
              {modalLook.pieces.map((p, i) => (
                <a key={i} href={`/go/${p.id}?outfit=${modalLook.id}`} target="_blank" rel="noopener noreferrer sponsored" className="modal-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="modal-item-img"><img src={p.packshot} alt={p.name} /></div>
                  <div className="modal-item-info">
                    <div className="modal-item-name">{p.name}</div>
                    <div className="modal-item-brand">{p.brand}</div>
                    <div className="modal-item-store">↗ {storeName(p.store)}</div>
                  </div>
                  <div className="modal-item-price">{eur(p.price)}</div>
                </a>
              ))}
              <div className="modal-footer">
                <span className="modal-footer-label">{t.total}</span>
                <span className="modal-footer-price">{eur(Number(modalLook.total) || modalLook.pieces.reduce((s, p) => s + (p.price || 0), 0))}</span>
              </div>
              <button
                className="modal-buy"
              onClick={() => window.open(`/look/${modalLook.slug}`, "_blank", "noopener,noreferrer")}
              >
                {t.buy_btn} <span style={{ marginLeft: 10 }}>{eur(Number(modalLook.total) || modalLook.pieces.reduce((s, p) => s + (p.price || 0), 0))}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
