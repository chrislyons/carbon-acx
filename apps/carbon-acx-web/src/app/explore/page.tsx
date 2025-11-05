import Link from 'next/link'

export default function ExplorePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Explore Data
        </h1>
        <p className="text-lg text-gray-600">
          Visualize emissions data in interactive 2D charts and 3D universe views.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              2D Visualizations
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Charts, graphs, and tables for analyzing emissions data
            </p>
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Coming Soon
            </span>
          </div>
        </div>

        <Link
          href="/explore/3d"
          className="bg-white border border-gray-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="text-center">
            <div className="text-5xl mb-4">🌌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              3D Universe
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Immersive 3D visualization from ACX084 (Three.js + React Three Fiber)
            </p>
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              ✓ Live Now
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Phase 3 Features (Now Available)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded border border-green-200">
            <div className="flex items-center mb-2">
              <span className="text-green-600 mr-2">✓</span>
              <h4 className="font-medium text-gray-900">DataUniverse Port</h4>
            </div>
            <p className="text-sm text-gray-600">
              520-line DataUniverse component from ACX084 with Next.js SSR safety
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded border border-green-200">
            <div className="flex items-center mb-2">
              <span className="text-green-600 mr-2">✓</span>
              <h4 className="font-medium text-gray-900">Camera Choreography</h4>
            </div>
            <p className="text-sm text-gray-600">
              Intro zoom, click-to-fly, and orbital mechanics fully preserved
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded border border-green-200">
            <div className="flex items-center mb-2">
              <span className="text-green-600 mr-2">✓</span>
              <h4 className="font-medium text-gray-900">Manifest Integration</h4>
            </div>
            <p className="text-sm text-gray-600">
              Click spheres to view emissions data with manifest provenance
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
