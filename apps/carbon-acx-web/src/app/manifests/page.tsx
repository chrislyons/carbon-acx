import Link from 'next/link'
import { getManifests } from '@/lib/manifests'

export default async function ManifestsPage() {
  const manifests = await getManifests()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Manifest Explorer
        </h1>
        <p className="text-lg text-gray-600">
          View all figure manifests with byte hashes, provenance tracking, and
          citation keys. Every manifest represents a reproducible data artifact.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Manifests
            </h2>
            <span className="text-sm text-gray-500">
              {manifests.length} {manifests.length === 1 ? 'manifest' : 'manifests'}
            </span>
          </div>
        </div>

        {manifests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No manifests found</p>
            <p className="text-sm text-gray-400 mt-2">
              Run <code className="bg-gray-100 px-2 py-1 rounded">make build</code> to
              generate manifests
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {manifests.map((manifest) => (
              <Link
                key={manifest.id}
                href={`/manifests/${manifest.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {manifest.figure_id}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        Hash: <code className="bg-gray-100 px-1 rounded">{manifest.hash_prefix}</code>
                      </span>
                      <span>•</span>
                      <span>
                        Generated: {new Date(manifest.generated_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {manifest.figure_path}
                    </p>
                  </div>
                  <div className="ml-4">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          What is a Manifest?
        </h3>
        <p className="text-sm text-blue-800">
          Each manifest contains metadata about a figure: generation timestamp,
          byte hash (SHA256), citation keys, and provenance chain. This enables
          verification of data integrity and reproducibility.
        </p>
      </div>
    </div>
  )
}
