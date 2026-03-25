import Link from 'next/link'

interface FooterLink {
  href: string
  label: string
  external?: boolean
}

const productLinks: FooterLink[] = [
  { href: '/calculator', label: 'Calculator' },
  { href: '/explore', label: 'Explore' },
  { href: '/explore/3d', label: '3D Universe' },
  { href: '/explore/worlds', label: 'Carbon Worlds' },
  { href: '/manifests', label: 'Manifests' },
] as const

const referenceLinks: FooterLink[] = [
  { href: '/methodology', label: 'Methodology' },
  { href: '/api/health', label: 'API health' },
  { href: 'https://github.com/chrislyons/carbon-acx', label: 'Repository', external: true },
  { href: 'https://github.com/chrislyons/carbon-acx/tree/main/docs', label: 'Docs tree', external: true },
] as const

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="page-shell py-10 sm:py-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="brand-mark" aria-hidden="true">
                AC
              </span>
              <div>
                <div className="text-lg font-semibold text-foreground">Carbon ACX</div>
                <div className="metric-label">Manifest-first carbon accounting</div>
              </div>
            </div>
            <p className="section-copy mt-4 max-w-xl">
              Carbon ACX packages calculator data, manifests, and exploration routes from the same derivation
              pipeline so the product surface stays auditable and consistent.
            </p>
          </div>

          <div>
            <div className="section-kicker">Product</div>
            <ul className="footer-list mt-4">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="quiet-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="section-kicker">Reference</div>
            <ul className="footer-list mt-4">
              {referenceLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quiet-link"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="quiet-link">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="surface-divider" />
        <div className="flex flex-col gap-2 text-sm text-[color:var(--text-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} Carbon ACX</span>
          <span>Derived data, inspectable manifests, and compact product routing.</span>
        </div>
      </div>
    </footer>
  )
}
