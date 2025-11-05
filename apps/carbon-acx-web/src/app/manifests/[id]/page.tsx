import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getManifest } from '@/lib/manifests'

interface ManifestDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ManifestDetailPage({ params }: ManifestDetailPageProps) {
  const { id } = await params
  const manifest = await getManifest(id)

  if (!manifest) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/manifests"
          className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
        >
          ← Back to Manifests
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {manifest.figure_id}
        </h1>
        <p className="text-gray-600">
          Schema: {manifest.schema_version}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Metadata Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Metadata
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Generated At</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(manifest.generated_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Hash Prefix</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {manifest.hash_prefix}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Figure Method</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {manifest.figure_method}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Figure Path</dt>
              <dd className="text-sm text-gray-900 mt-1 font-mono break-all">
                {manifest.figure_path}
              </dd>
            </div>
          </dl>
        </div>

        {/* Byte Hash Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Byte Hash (SHA256)
          </h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <code className="text-xs text-gray-800 break-all font-mono">
              {manifest.figure_sha256}
            </code>
          </div>
          <div className="mt-4">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              Verify Hash
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Numeric Invariance
            </h3>
            <div className="flex items-center space-x-2">
              {manifest.numeric_invariance.passed ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700">Passed</span>
                </>
              ) : (
                <>
                  <span className="text-red-600">✗</span>
                  <span className="text-sm text-gray-700">Failed</span>
                </>
              )}
              <span className="text-xs text-gray-500">
                (tolerance: {manifest.numeric_invariance.tolerance_percent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Citations Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Citation Keys
          </h2>
          {manifest.citation_keys.length > 0 ? (
            <ul className="space-y-2">
              {manifest.citation_keys.map((key, index) => (
                <li
                  key={key}
                  className="flex items-center space-x-2 text-sm"
                >
                  <span className="text-gray-500">[{index + 1}]</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">
                    {key}
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No citations</p>
          )}
        </div>

        {/* References Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            References
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">File Path</dt>
              <dd className="text-sm text-gray-900 mt-1 font-mono break-all">
                {manifest.references.path}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">SHA256</dt>
              <dd className="text-xs text-gray-900 mt-1 font-mono break-all">
                {manifest.references.sha256}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Line Count</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {manifest.references.line_count}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Provenance Chain */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Provenance Chain
        </h2>
        <div className="space-y-3">
          {manifest.references.order.map((ref) => (
            <div
              key={ref.index}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                {ref.index}
              </div>
              <div className="flex-1">
                <code className="text-sm text-gray-800">{ref.source_id}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex space-x-4">
        <a
          href={`/api/manifests/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          View JSON
        </a>
        <a
          href={`/api/manifests/${id}?verify=true`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
        >
          Verify with API
        </a>
      </div>
    </div>
  )
}
