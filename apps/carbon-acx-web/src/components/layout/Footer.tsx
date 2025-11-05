import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Carbon ACX
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Open reference stack for trustworthy carbon accounting with
              manifest-first architecture, byte hashes, and provenance tracking.
            </p>
            <p className="text-xs text-gray-500">
              Licensed under MIT. Built with Next.js 15.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Features
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/calculator"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Activity Calculator
                </Link>
              </li>
              <li>
                <Link
                  href="/explore"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Data Explorer
                </Link>
              </li>
              <li>
                <Link
                  href="/manifests"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Manifest Viewer
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Methodology
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/chrislyons/carbon-acx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link
                  href="/api/health"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  API Status
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/chrislyons/carbon-acx/blob/main/docs/API.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  API Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            © {currentYear} Carbon ACX. All rights reserved. |{' '}
            <span className="text-gray-400">
              Ref: ACX093 Strategic Frontend Rebuild
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}
