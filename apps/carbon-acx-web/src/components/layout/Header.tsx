'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'

const links = [{ href: '/', label: 'Home' }, { href: '/calculator', label: 'Calculator' }, { href: '/explore', label: 'Explore' }, { href: '/learn', label: 'Learn' }, { href: '/methodology', label: 'Methodology' }] as const

export function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="site-header">
      <div className="page-shell site-header__inner">
        <Link href="/" className="site-header__brand">
          Carbon ACX <span>carbon literacy</span>
        </Link>
        <nav aria-label="Primary" className="site-header__desktop-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="mode-switcher__button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <button
          type="button"
          className="site-header__mobile-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-primary-navigation"
        >
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
        {mobileMenuOpen ? (
          <nav id="mobile-primary-navigation" aria-label="Primary" className="site-header__mobile-nav">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  )
}
