export default function CalculatorPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Activity Calculator
        </h1>
        <p className="text-lg text-gray-600">
          Calculate your carbon footprint by answering a few questions about your
          daily activities.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧮</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Calculator Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            The multi-step calculator wizard is currently being implemented.
          </p>
          <div className="inline-block text-left bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Planned Features:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ 4-step wizard (commute, diet, energy, shopping)</li>
              <li>✓ Real-time emission calculations</li>
              <li>✓ Unit conversion (metric ↔ imperial)</li>
              <li>✓ Comparison visualizations</li>
              <li>✓ Save to profile (localStorage)</li>
              <li>✓ Export results (CSV, JSON)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Phase 2 Implementation
        </h3>
        <p className="text-sm text-blue-800">
          This calculator will use React Hook Form for state management and
          TanStack Query for API communication. Results will be stored locally
          and optionally synced to a backend profile.
        </p>
      </div>
    </div>
  )
}
