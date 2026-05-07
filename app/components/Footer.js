'use client'

import { useLang } from './LangProvider'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="footer">
      <div className="footer-logo"><span>M</span>ise</div>
      <p className="footer-text">{t.footer_text}</p>
      <div className="footer-links">
        <a className="footer-link">{t.footer_about}</a>
        <a className="footer-link">{t.footer_how}</a>
        <a className="footer-link">{t.footer_contact}</a>
        <a className="footer-link">Instagram</a>
        <a className="footer-link">{t.footer_privacy}</a>
      </div>
      <p className="footer-copy">© 2026 MISE. All rights reserved.</p>
    </footer>
  )
}