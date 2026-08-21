'use client'

import { useLang } from './LangProvider'
import { CATEGORIES } from '@/lib/categories'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="footer">
      <div className="footer-logo"><span>M</span>ise</div>
      <p className="footer-text">{t.footer_text}</p>
      <nav className="footer-links" aria-label="Outfit categories" style={{ maxWidth: 900, margin: '0 auto 14px' }}>
        {CATEGORIES.map((c) => (
          <a key={c.slug} className="footer-link" href={'/outfits/' + c.slug}>
            {c.title}
          </a>
        ))}
      </nav>
      <div className="footer-links">
        <a className="footer-link" href="/outfits">Outfit Ideas</a>
        <a className="footer-link" href="/about">{t.footer_about}</a>
        <a className="footer-link" href="/how-it-works">{t.footer_how}</a>
        <a className="footer-link" href="/contact">{t.footer_contact}</a>
        <a className="footer-link" href="/disclosure">{t.footer_disclosure}</a>
        <a className="footer-link" href="/privacy">{t.footer_privacy}</a>
      </div>
      <p className="footer-copy">© 2026 MISE. All rights reserved.</p>
    </footer>
  )
}
