'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/calculator', label: 'Calculator' },
  { href: '/explore', label: 'Explore' },
  { href: '/manifests', label: 'Manifests' },
  { href: '/methodology', label: 'Methodology' },
] as const

export function Header() {
  const pathname = usePathname()

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
        </div>
      </div>
    </header>
  )
}
