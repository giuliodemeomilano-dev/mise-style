'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from './LangProvider'

const BRANDS = ['COS', 'ARKET', 'Sandro', 'Massimo Dutti', 'The Frankie Shop', 'BOSS', 'Polène', 'Jacquemus', 'Mejuri', 'Castañer', 'Veja', 'Ancient Greek Sandals']


// The cut-outs keep the brand's original canvas, so the garment sits wherever the
// brand happened to place it. cutout_box is its measured alpha bounding box,
// "ar,top,bottom,left,right" as fractions. This centres the garment in the cell and
// scales it to a constant share of the box, which is what makes a row of pieces
// look aligned instead of drifting. Falls back to plain contain when absent.
const FILL = 0.78
function cutFit(box) {
  if (!box) return undefined
  const p = String(box).split(',').map(Number)
  if (p.length !== 5 || p.some((n) => !Number.isFinite(n))) return undefined
  const [ar, top, bottom, left, right] = p
  const cw = right - left
  const ch = bottom - top
  if (!(ar > 0 && cw > 0 && ch > 0)) return undefined
  const w = Math.min(FILL / cw, (FILL * ar) / ch)
  const h = w / ar
  return {
    position: 'absolute',
    width: `${(w * 100).toFixed(3)}%`,
    height: 'auto',
    padding: 0,
    objectFit: 'fill',
    left: `${((0.5 - ((left + right) / 2) * w) * 100).toFixed(3)}%`,
    top: `${((0.5 - ((top + bottom) / 2) * h) * 100).toFixed(3)}%`,
  }
}

export default function HomeContent({ looks }) {
  const { t } = useLang()
  const [filter, setFilter] = useState('all')
  const [gender, setGender] = useState('women')
  const [view, setView] = useState('discover')
  const [budget, setBudget] = useState(null)
  const [modalLook, setModalLook] = useState(null)
  const [liked, setLiked] = useState({})

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

  let displayed = filtered
  if (view === 'trending') {
    displayed = [...filtered].sort((a, b) => (b.featured || 0) - (a.featured || 0)).slice(0, 12)
  } else if (view === 'new') {
    displayed = [...filtered].sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
  }

  const openModal = (look) => {
    setModalLook(look)
    document.body.style.overflow = 'hidden'
  }
  const closeModal = () => {
    setModalLook(null)
    document.body.style.overflow = ''
  }

  const toggleLike = (e, id) => {
    e.stopPropagation()
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }))
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
            <span className="budget-value">€<input type="text" inputMode="numeric" className="budget-input" title="Click to type your max budget" placeholder="–" value={budget ?? ''} onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); setBudget(raw === '' ? null : Number(raw)); }} onBlur={(e) => { const s = e.target.value.trim(); if (s === '') { setBudget(null); return; } const v = Number(s) || 100; setBudget(Math.min(1500, Math.max(100, v))); }} /></span>
          </div>
        </div>
      </section>

      <section className="looks-section">
        <div className="looks-grid">
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 40 }}>
              No outfits match this filter yet. Try another category.
            </p>
          )}
          {displayed.map((look) => {
            const total = Number(look.total) || look.pieces.reduce((s, p) => s + (p.price || 0), 0)
            const storeCount = new Set(look.pieces.map((p) => p.store)).size
            // The card leads with the model photo when the outfit has one, then the
            // packshots follow as the next slides, so you see the look worn and then
            // each piece on its own.
            const slides = (look.model ? [{ src: look.model, kind: 'model' }] : []).concat(
              look.pieces.map((p) => ({ src: p.packshot || look.hero, kind: p.cut ? 'cut' : 'raw', box: p.box }))
            )
            const slideIdx = (carIdx[look.id] || 0) % slides.length
            return (
              <div key={look.id} className="look-card visible">
                <Link href={`/look/${look.slug}`} className="look-visual" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <span className="badge-ai">{t.filters[look.cat] || t.badge}</span>
                  <button
                    className={`btn-save${liked[look.id] ? ' liked' : ''}`}
                    onClick={(e) => { e.preventDefault(); toggleLike(e, look.id) }}
                  >
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
              <div className="model-hero model-hero-clean car-wrap" onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }} onTouchEnd={(e) => onSwipeEnd(e, look.id, slides.length)}>
                <img src={slides[slideIdx].src} className={slides[slideIdx].kind === 'raw' ? undefined : 'is-' + slides[slideIdx].kind} style={cutFit(slides[slideIdx].box)} alt={look.title} loading="lazy" />
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
                <div className="model-meta-dark">{look.pieces.length} {t.pieces} · {storeCount} {t.stores} · €{total}</div>
              </div>
                  <div className="pieces-strip">
                    {look.pieces.map((p, i) => (
                      <div key={i} className="strip-item">
                        <img src={p.packshot} className={p.cut ? 'is-cut' : undefined} style={cutFit(p.box)} alt={p.name} loading="lazy" />
                        <div className="strip-label">
                          <div className="strip-brand">{p.brand}</div>
                          <div className="strip-price">€{p.price}</div>
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
                    <div className="card-total-price">€{total}</div>
                  </div>
                  <button className="btn-shop" onClick={() => openModal(look)}>
                    {t.shop_btn}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
                  {modalLook.pieces.length} {t.pieces} {t.from} {new Set(modalLook.pieces.map((p) => p.store)).size} {t.stores}
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
                    <div className="modal-item-store">↗ {p.store}</div>
                  </div>
                  <div className="modal-item-price">€{p.price}</div>
                </a>
              ))}
              <div className="modal-footer">
                <span className="modal-footer-label">{t.total}</span>
                <span className="modal-footer-price">€{Number(modalLook.total) || modalLook.pieces.reduce((s, p) => s + (p.price || 0), 0)}</span>
              </div>
              <button
                className="modal-buy"
              onClick={() => window.open(`/look/${modalLook.slug}`, "_blank", "noopener,noreferrer")}
              >
                {t.buy_btn} — €{Number(modalLook.total) || modalLook.pieces.reduce((s, p) => s + (p.price || 0), 0)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
