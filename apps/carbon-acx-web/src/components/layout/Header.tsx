'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'

const navItems = [
  { href: '/calculator', label: 'Calculator' },
  { href: '/explore', label: 'Explore' },
  { href: '/manifests', label: 'Manifests' },
  { href: '/methodology', label: 'Methodology' },
] as const

export function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="site-header">
      <div className="page-shell py-2.5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="brand-mark" aria-hidden="true">
                AC
              </span>
              <span>
                <span className="text-lg font-semibold text-foreground sm:text-xl">Carbon ACX</span>
                <span className="block text-sm text-[color:var(--text-subtle)]">
                  Trustworthy carbon accounting
                </span>
              </span>
            </Link>

            <a
              href="https://github.com/chrislyons/carbon-acx"
              target="_blank"
              rel="noopener noreferrer"
              className="action-link hidden sm:inline-flex"
            >
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <nav className="flex flex-wrap gap-2" aria-label="Primary">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-chip"
                    data-active={isActive ? 'true' : 'false'}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <button
              onClick={toggleTheme}
              className="action-link action-link-ghost p-2"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}