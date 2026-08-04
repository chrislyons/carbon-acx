'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'

const links = [{ href: '/', label: 'Home' }, { href: '/calculator', label: 'Calculator' }, { href: '/explore', label: 'Explore' }, { href: '/learn', label: 'Learn' }, { href: '/methodology', label: 'Methodology' }] as const

export function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  return <header className="site-header"><div className="page-shell site-header__inner"><Link href="/" className="site-header__brand">Carbon ACX <span>evidence-led carbon literacy</span></Link><nav aria-label="Primary">{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}</nav><button className="mode-switcher__button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? 'Light' : 'Dark'}</button></div></header>
}
