'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'
import { ROUTE_ITEMS } from '@/components/layout/routeMeta'

export function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null)

  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  useEffect(() => {
    const activeLink = activeLinkRef.current
    if (!activeLink) return
    activeLink.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= ROUTE_ITEMS.length) return
      const link = document.querySelector<HTMLElement>(`nav[aria-label="Primary"] a:nth-of-type(${index + 1})`)
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
        <div className="site-header__row">
          <Link href="/" className="site-header__brand">
            Carbon ACX <span>carbon literacy index</span>
          </Link>
          <button
            type="button"
            className="mode-switcher__button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <nav aria-label="Primary" className="site-header__nav">
          {ROUTE_ITEMS.map((route) => {
            const current = isCurrent(route.href)
            const Icon = route.icon
            return (
              <Link
                key={route.id}
                href={route.href}
                ref={current ? activeLinkRef : undefined}
                aria-current={current ? 'page' : undefined}
                title={route.cue}
              >
                <Icon aria-hidden="true" size={17} strokeWidth={2} />
                <span>{route.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
