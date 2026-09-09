'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useLang } from './LangProvider'

export default function BottomNav() {
  const { t } = useLang()
  const pathname = usePathname()
  const home = pathname === '/'
  const [view, setView] = useState('discover')

  const go = (v) => () => {
    setView(v)
    if (home) window.dispatchEvent(new CustomEvent('mise-view', { detail: v }))
  }

  const cls = (k) => 'bnav-item' + (home && view === k ? ' active' : '')

  return (
    <nav className="bottom-nav">
      <a className={cls('discover')} href="/#looks" onClick={go('discover')}>
        <span className="bnav-icon">◆</span>
        <span className="bnav-label">{t.nav_discover}</span>
      </a>
      <a className={cls('new')} href="/#looks" onClick={go('new')}>
        <span className="bnav-icon">✦</span>
        <span className="bnav-label">{t.nav_foryou}</span>
      </a>
      <a className="bnav-item" href="/outfits/womens-summer-outfits">
        <span className="bnav-icon">♀</span>
        <span className="bnav-label">{t.bnav_women}</span>
      </a>
      <a className="bnav-item" href="/outfits/mens-summer-outfits">
        <span className="bnav-icon">♂</span>
        <span className="bnav-label">{t.bnav_men}</span>
      </a>
    </nav>
  )
}
