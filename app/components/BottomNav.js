'use client'

import { useLang } from './LangProvider'

export default function BottomNav() {
  const { t } = useLang()

  return (
    <nav className="bottom-nav">
      <a className="bnav-item active">
        <span className="bnav-icon">◆</span>
        <span className="bnav-label">{t.nav_discover}</span>
      </a>
      <a className="bnav-item">
        <span className="bnav-icon">♡</span>
        <span className="bnav-label">{t.bnav_saved}</span>
      </a>
      <a className="bnav-item">
        <span className="bnav-icon">✦</span>
        <span className="bnav-label">{t.nav_foryou}</span>
      </a>
      <a className="bnav-item">
        <span className="bnav-icon">○</span>
        <span className="bnav-label">{t.bnav_profile}</span>
      </a>
    </nav>
  )
}