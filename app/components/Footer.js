'use client'

import { useLang } from './LangProvider'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="footer">
      <div className="footer-logo"><span>M</span>ise</div>
      <p className="footer-text">{t.footer_text}</p>
      <div className="footer-links">
        <a className="footer-link" href="/about">{t.footer_about}</a>
        <a className="footer-link" href="/how-it-works">{t.footer_how}</a>
        <a className="footer-link" href="/contact">{t.footer_contact}</a>
        <a className="footer-link" href="/disclosure">Affiliate Disclosure</a>
        <a className="footer-link" href="/privacy">{t.footer_privacy}</a>
      </div>
      <p className="footer-copy">© 2026 MISE. All rights reserved.</p>
    </footer>
  )
}
