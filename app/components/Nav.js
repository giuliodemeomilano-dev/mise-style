'use client'

import { useEffect, useState } from 'react'
import { useLang } from './LangProvider'

export default function Nav() {
  const { lang, changeLang, t } = useLang()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-inner">
        <div className="nav-logo"><span>M</span>ise</div>
        <div className="nav-right">
          <div className="nav-links">
            <a className="nav-link" href="#looks">{t.nav_discover}</a>
            <a className="nav-link" href="#looks">{t.nav_trending}</a>
            <a className="nav-link" href="#looks">{t.nav_foryou}</a>
          </div>
          <div className="lang-selector">
            <button
              className={`lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => changeLang('en')}
            >EN</button>
            <button
              className={`lang-btn${lang === 'fr' ? ' active' : ''}`}
              onClick={() => changeLang('fr')}
            >FR</button>
            <button
              className={`lang-btn${lang === 'es' ? ' active' : ''}`}
              onClick={() => changeLang('es')}
            >ES</button>
          </div>
          <div className="nav-icons">
            <svg className="nav-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <svg className="nav-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
        </div>
      </div>
    </nav>
  )
}
