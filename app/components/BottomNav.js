'use client'

import { usePathname } from 'next/navigation'
import { useLang } from './LangProvider'

// The Women and Men tabs open the season page of today, so they never point
// at summer outfits in October.
function seasonSlug() {
  const m = new Date().getUTCMonth() + 1
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'
}
const SEASON = seasonSlug() === 'spring' ? 'summer' : seasonSlug()
const WOMEN = '/outfits/womens-' + SEASON + '-outfits'
const MEN = '/outfits/mens-' + SEASON + '-outfits'

export default function BottomNav() {
  const { t } = useLang()
  const pathname = usePathname() || '/'

  const items = [
    { icon: '◆', label: t.nav_discover, href: '/#looks', on: pathname === '/' },
    { icon: '♀', label: t.bnav_women, href: WOMEN, on: pathname === WOMEN },
    { icon: '♂', label: t.bnav_men, href: MEN, on: pathname === MEN },
    {
      icon: '✦',
      label: t.bnav_ideas,
      href: '/outfits',
      on: pathname.startsWith('/outfits') && pathname !== WOMEN && pathname !== MEN,
    },
  ]

  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <a key={it.href} className={'bnav-item' + (it.on ? ' active' : '')} href={it.href}>
          <span className="bnav-icon">{it.icon}</span>
          <span className="bnav-label">{it.label}</span>
        </a>
      ))}
    </nav>
  )
}
