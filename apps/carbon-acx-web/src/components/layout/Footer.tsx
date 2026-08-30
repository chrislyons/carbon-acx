import { ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell reference-strip">
        <span>Carbon ACX · published factors and static artifacts</span>
        <nav aria-label="Reference">
          <a href="/artifacts/"><ExternalLink aria-hidden="true" size={14} />Raw artifacts</a>
          <a href="https://github.com/chrislyons/carbon-acx" target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" size={14} />Repository
          </a>
        </nav>
      </div>
    </footer>
  )
}
