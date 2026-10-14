'use client'

import { useLang } from './LangProvider'
import { liveCategories } from '@/lib/categories'
import { tr, catTitle } from '@/lib/tr'

export default function Footer() {
  const { t, lang } = useLang()
  const x = (id, en) => tr(lang, id) || en

  return (
    <footer className="footer">
      <div className="footer-logo"><span>M</span>ise</div>
      <p className="footer-text">{t.footer_text}</p>
      <nav className="footer-links" aria-label="Outfit categories" style={{ maxWidth: 900, margin: '0 auto 28px' }}>
        {liveCategories().map((c) => (
          <a key={c.slug} className="footer-link" href={'/outfits/' + c.slug}>
            {catTitle(lang, c)}
          </a>
        ))}
      </nav>
      <div className="footer-links">
        <a className="footer-link" href="/outfits">{x('outfit_ideas', 'Outfit Ideas')}</a>
        <a className="footer-link" href="/style">{x('style_guides', 'Style Guides')}</a>
        <a className="footer-link" href="/brands">{x('brands', 'Brands')}</a>
        <a className="footer-link" href="/search">{x('search', 'Search')}</a>
        <a className="footer-link" href="/about">{t.footer_about}</a>
        <a className="footer-link" href="/how-it-works">{t.footer_how}</a>
        <a className="footer-link" href="/contact">{t.footer_contact}</a>
        <a className="footer-link" href="/disclosure">{t.footer_disclosure}</a>
        <a className="footer-link" href="/privacy">{t.footer_privacy}</a>
      </div>
      <p className="footer-copy">{x('copyright', '© 2026 MISE. All rights reserved.')}</p>
    </footer>
  )
}
