'use client'

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/app/components/LangProvider'
import { UI } from '@/lib/ui-strings'
import LookCard from '@/app/components/LookCard'

export default function SearchClient({ facets, initial }) {
  const { lang } = useLang()
  const u = UI[lang] || UI.en
  const [q, setQ] = useState('')
  const [g, setG] = useState('women')
  const [colour, setColour] = useState(null)
  const [item, setItem] = useState(null)
  const [brand, setBrand] = useState(null)
  const [max, setMax] = useState(null)
  const [res, setRes] = useState(initial)
  const [busy, setBusy] = useState(false)
  const first = useRef(true)

  // Read filters from the address, so a search can be shared or bookmarked.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('q')) setQ(sp.get('q'))
    if (sp.get('g')) setG(sp.get('g'))
    if (sp.get('colour')) setColour(sp.get('colour'))
    if (sp.get('item')) setItem(sp.get('item'))
    if (sp.get('brand')) setBrand(sp.get('brand'))
    if (sp.get('max')) setMax(Number(sp.get('max')))
  }, [])

  useEffect(() => {
    if (first.current && !q && g === 'women' && !colour && !item && !brand && !max) {
      first.current = false
      return
    }
    first.current = false
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (g) params.set('g', g)
    if (colour) params.set('colour', colour)
    if (item) params.set('item', item)
    if (brand) params.set('brand', brand)
    if (max) params.set('max', String(max))
    const qs = params.toString()
    window.history.replaceState(null, '', '/search' + (qs ? '?' + qs : ''))
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const r = await fetch('/api/search?' + qs, { signal: ctl.signal })
        const d = await r.json()
        if (d.ok) setRes(d)
      } catch (e) {
      } finally {
        setBusy(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctl.abort()
    }
  }, [q, g, colour, item, brand, max])

  const chip = (active, onClick, label, key) => (
    <button key={key || label} type="button" className={'filter-pill' + (active ? ' active' : '')} onClick={onClick}>
      {label}
    </button>
  )
  const anyFilter = colour || item || brand || max || q

  return (
    <main className="seo-page search-page">
      <h1>{u.search_title}</h1>
      <div className="search-bar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={u.search_ph}
          aria-label={u.search_title}
          autoFocus
        />
      </div>

      <div className="gender-toggle" style={{ margin: '18px 0 10px' }}>
        <button className={'gender-pill' + (g === 'women' ? ' active' : '')} onClick={() => setG('women')}>{u.women}</button>
        <button className={'gender-pill' + (g === 'men' ? ' active' : '')} onClick={() => setG('men')}>{u.men}</button>
      </div>

      <div className="facet">
        <span className="facet-label">{u.f_colour}</span>
        <div className="facet-row">
          {facets.colours.map((c) =>
            chip(colour === c.key, () => setColour(colour === c.key ? null : c.key), (
              <>
                <span className={'dot dot-' + c.key} aria-hidden="true" />
                {c.label}
              </>
            ), c.key)
          )}
        </div>
      </div>
      <div className="facet">
        <span className="facet-label">{u.f_item}</span>
        <div className="facet-row">
          {facets.items.map((c) => chip(item === c.key, () => setItem(item === c.key ? null : c.key), c.label, c.key))}
        </div>
      </div>
      <div className="facet">
        <span className="facet-label">{u.f_brand}</span>
        <div className="facet-row">
          {facets.brands.map((b) => chip(brand === b, () => setBrand(brand === b ? null : b), b, b))}
        </div>
      </div>
      <div className="facet">
        <span className="facet-label">{u.f_price}</span>
        <div className="facet-row">
          {[300, 500, 750, 1000].map((m) => chip(max === m, () => setMax(max === m ? null : m), '€' + m, 'm' + m))}
        </div>
      </div>

      <p className="search-count">
        {busy ? '…' : res.count + ' ' + u.results}
        {anyFilter && (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setQ('')
              setColour(null)
              setItem(null)
              setBrand(null)
              setMax(null)
            }}
          >
            {u.f_clear}
          </button>
        )}
      </p>

      {res.count === 0 ? (
        <p className="seo-intro">{u.no_results}</p>
      ) : (
        <div className="looks-grid">
          {res.looks.map((l) => (
            <LookCard key={l.id} look={l} />
          ))}
        </div>
      )}
    </main>
  )
}
