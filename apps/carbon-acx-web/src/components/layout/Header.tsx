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

  // Number-key navigation: 1-5 jump to the primary nav destinations in DOM
  // order. Ignored while typing in form fields or with modifier keys held, so
  // calculator inputs keep their digits.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= links.length) return
      const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary"]')
      const link = nav?.querySelectorAll<HTMLElement>('a')[index]
      if (!link) return
      event.preventDefault()
      link.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])


  return (
    <header className="site-header">
      <div className="page-shell site-header__inner">
        <Link href="/" className="site-header__brand">
          Carbon ACX <span>carbon literacy index</span>
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
