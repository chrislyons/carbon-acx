import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-24 px-4">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">
          Carbon ACX
        </h1>
        <p className="text-2xl text-gray-600 mb-8">
          Trustworthy Carbon Accounting
        </p>
        <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
          Open reference stack for carbon accounting with manifest-first architecture,
          byte hashes, and provenance tracking. Built on Python data pipelines and
          modern web technologies.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Link
            href="/calculator"
            className="p-6 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Calculator
            </h3>
            <p className="text-gray-600">
              Calculate your carbon footprint with our activity-based wizard
            </p>
          </Link>

          <Link
            href="/explore"
            className="p-6 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Explore Data
            </h3>
            <p className="text-gray-600">
              Visualize emissions data in 2D and 3D interactive views
            </p>
          </Link>

          <Link
            href="/manifests"
            className="p-6 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Manifests
            </h3>
            <p className="text-gray-600">
              View provenance, byte hashes, and data lineage
            </p>
          </Link>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Phase 1: Foundation Complete
          </h2>
          <div className="text-left max-w-2xl mx-auto">
            <ul className="space-y-2 text-gray-700">
              <li>✅ Next.js 15 with App Router</li>
              <li>✅ TypeScript and Tailwind CSS</li>
              <li>✅ Manifest data layer</li>
              <li>✅ API routes (/api/manifests, /api/health)</li>
              <li>✅ Cloudflare Pages configuration</li>
              <li>✅ Basic layout and navigation</li>
            </ul>
            <p className="mt-6 text-sm text-gray-500">
              Ref: ACX093 Strategic Frontend Rebuild Specification
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
