'use client'

import { useState } from 'react'
import { useLang } from './LangProvider'

const BRANDS = ['Sézane', 'COS', 'Jacquemus', 'Zara', 'The Frankie Shop', 'Polène', 'Mango', 'Reformation', 'Arket', 'Sandro', 'Mejuri', 'Veja']

export default function HomeContent({ looks }) {
  const { t } = useLang()
  const [filter, setFilter] = useState('all')
  const [budget, setBudget] = useState(800)
  const [modalLook, setModalLook] = useState(null)
  const [liked, setLiked] = useState({})

  const cats = ['all', 'casual', 'office', 'evening', 'street', 'brunch', 'date']

  const filtered = filter === 'all' ? looks : looks.filter((l) => l.cat === filter)

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
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <span className="budget-value">€{budget}</span>
          </div>
        </div>
      </section>

      <section className="looks-section">
        <div className="looks-grid">
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 40 }}>
              No looks match this filter yet. Try another category.
            </p>
          )}
          {filtered.map((look) => {
            const total = Number(look.total) || look.pieces.reduce((s, p) => s + (p.price || 0), 0)
            const storeCount = new Set(look.pieces.map((p) => p.store)).size
            return (
              <div key={look.id} className="look-card visible" onClick={() => openModal(look)}>
                <div className="look-visual">
                  <span className="badge-ai">{t.badge}</span>
                  <button
                    className={`btn-save${liked[look.id] ? ' liked' : ''}`}
                    onClick={(e) => toggleLike(e, look.id)}
                  >
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  <div className="model-hero">
                    <img src={look.hero} alt={look.title} loading="lazy" />
                    <div className="model-gradient"></div>
                    <div className="model-info">
                      <div className="model-title">{look.title}</div>
                      <div className="model-meta">{look.pieces.length} {t.pieces} · {storeCount} {t.stores} · €{total}</div>
                    </div>
                  </div>
                  <div className="pieces-strip">
                    {look.pieces.map((p, i) => (
                      <div key={i} className="strip-item">
                        <img src={p.img} alt={p.name} loading="lazy" />
                        <div className="strip-label">
                          <div className="strip-brand">{p.brand}</div>
                          <div className="strip-price">€{p.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                  <button className="btn-shop" onClick={(e) => { e.stopPropagation(); openModal(look) }}>
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
                <div key={i} className="modal-item">
                  <div className="modal-item-img"><img src={p.img} alt={p.name} /></div>
                  <div className="modal-item-info">
                    <div className="modal-item-name">{p.name}</div>
                    <div className="modal-item-brand">{p.brand}</div>
                    <div className="modal-item-store">↗ {p.store}</div>
                  </div>
                  <div className="modal-item-price">€{p.price}</div>
                </div>
              ))}
              <div className="modal-footer">
                <span className="modal-footer-label">Total</span>
                <span className="modal-footer-price">€{Number(modalLook.total) || modalLook.pieces.reduce((s, p) => s + (p.price || 0), 0)}</span>
              </div>
              <button
                className="modal-buy"
                onClick={() => alert(t.modal_redirect.replace('{n}', new Set(modalLook.pieces.map((p) => p.store)).size))}
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