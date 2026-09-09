'use client'

import { usePathname } from 'next/navigation'
import { useLang } from './LangProvider'

const WOMEN = '/outfits/womens-summer-outfits'
const MEN = '/outfits/mens-summer-outfits'

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
