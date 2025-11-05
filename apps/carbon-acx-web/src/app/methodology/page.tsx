export default function MethodologyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Methodology
        </h1>
        <p className="text-lg text-gray-600">
          Transparent carbon accounting methodology with provenance tracking and
          reproducible calculations.
        </p>
      </div>

      <div className="prose prose-gray max-w-none">
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Data Pipeline
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <pre className="text-sm overflow-x-auto">
              {`CSV Inputs (data/)
    ↓
Pydantic Schemas (calc/schema.py)
    ↓
Derivation Engine (calc/derive.py)
    ↓
Figure Generation (calc/figures.py)
    ↓
Manifest Creation (calc/figures_manifest.py)
    ↓
Hashed Artifacts (dist/artifacts/<hash>/)`}
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Manifest-First Architecture
          </h2>
          <p className="text-gray-700 mb-4">
            Every data artifact is accompanied by a manifest containing:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <strong>Byte Hash (SHA256):</strong> Cryptographic hash of the figure
              for integrity verification
            </li>
            <li>
              <strong>Generation Timestamp:</strong> ISO 8601 timestamp of when the
              artifact was created
            </li>
            <li>
              <strong>Citation Keys:</strong> References to source data and
              methodology
            </li>
            <li>
              <strong>Provenance Chain:</strong> Complete lineage from raw data to
              final artifact
            </li>
            <li>
              <strong>Numeric Invariance:</strong> Test results ensuring calculations
              remain consistent
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Data Sources
          </h2>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Emission Factors
              </h3>
              <p className="text-sm text-gray-600">
                Source: <code>data/emission_factors.csv</code>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Validated emission factors from authoritative sources including IPCC,
                EPA, and GHG Protocol.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Grid Intensity
              </h3>
              <p className="text-sm text-gray-600">
                Source: <code>data/grid_intensity.csv</code>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Regional electricity grid carbon intensity values updated quarterly.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Activities
              </h3>
              <p className="text-sm text-gray-600">
                Source: <code>data/activities.csv</code>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Standardized activity definitions mapped to emission factors.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Verification
          </h2>
          <p className="text-gray-700 mb-4">
            All artifacts can be independently verified:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700">
            <li>Retrieve manifest from <code>/api/manifests/[id]</code></li>
            <li>Download referenced figure file</li>
            <li>Compute SHA256 hash of figure</li>
            <li>Compare computed hash with manifest.figure_sha256</li>
            <li>Verify numeric invariance tests passed</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Reproducibility
          </h2>
          <p className="text-gray-700 mb-4">
            The entire build process is reproducible:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
            <pre className="text-sm">
              <code>{`# Clone repository
git clone https://github.com/chrislyons/carbon-acx.git

# Install dependencies
poetry install

# Run derivation pipeline
make build

# Verify artifacts match manifests
pytest tests/test_manifests.py`}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}
