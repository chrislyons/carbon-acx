'use client'

import { compareCarbonCosts, formatCurrency, type CarbonPrice } from '@/lib/carbonPricing'

// Simplified price type for UI
interface SimpleCarbonPrice {
  jurisdiction: string
  priceUsdPerTonne: number
  schemeType: string
}

interface CarbonPricingChartProps {
  tonnesCo2e: number
  prices: SimpleCarbonPrice[]
  selectedJurisdictions?: string[]
  onSelectionChange?: (jurisdictions: string[]) => void
}

export function CarbonPricingChart({
  tonnesCo2e,
  prices,
  selectedJurisdictions = [],
  onSelectionChange,
}: CarbonPricingChartProps) {
  // Convert to full CarbonPrice for the comparison function
  const fullPrices: CarbonPrice[] = prices.map((p) => ({
    jurisdiction: p.jurisdiction,
    priceUsdPerTonne: p.priceUsdPerTonne,
    currency: 'USD',
    priceLocal: p.priceUsdPerTonne,
    year: 2024,
    sourceId: 'SRC.CARBON.PRICING.2024',
    schemeType: p.schemeType as 'ETS' | 'Carbon Tax' | 'Carbon Tax + ETS',
  }))

  const comparisons = compareCarbonCosts(tonnesCo2e, fullPrices)

  // Default selection: Canada Federal, EU ETS, California, Sweden
  const defaultSelection = ['Canada Federal', 'EU ETS', 'California', 'Sweden']
  const activeSelection = selectedJurisdictions.length > 0 ? selectedJurisdictions : defaultSelection

  const filteredComparisons = comparisons.filter((c) => activeSelection.includes(c.jurisdiction))

  return (
    <div className="surface-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Carbon Price Comparison
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">Your emissions:</span>
          <span className="font-mono text-foreground">{tonnesCo2e.toFixed(2)} tCO₂e</span>
        </div>
      </div>

      <p className="text-sm text-foreground-muted mb-4">
        What your footprint would cost under different carbon pricing schemes worldwide.
        <a
          href="https://carbonpricingdashboard.worldbank.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="quiet-link underline ml-1"
        >
          Data: World Bank Carbon Pricing Dashboard
        </a>
      </p>

      {/* Jurisdiction Selector */}
      <div className="mb-4">
        <label className="sr-only">Select jurisdictions to compare</label>
        <div className="flex flex-wrap gap-2">
          {prices.map((price) => (
            <button
              key={price.jurisdiction}
              onClick={() => {
                const newSelection = activeSelection.includes(price.jurisdiction)
                  ? activeSelection.filter((j) => j !== price.jurisdiction)
                  : [...activeSelection, price.jurisdiction]
                onSelectionChange?.(newSelection)
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                activeSelection.includes(price.jurisdiction)
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-background-hover text-foreground-muted border-surface-border hover:border-surface-border-strong'
              }`}
              aria-pressed={activeSelection.includes(price.jurisdiction)}
            >
              {price.jurisdiction}
            </button>
          ))}
        </div>
      </div>

      {/* Cost Bars */}
      <div className="space-y-3">
        {filteredComparisons
          .sort((a, b) => b.yourCost - a.yourCost)
          .map((comparison) => {
            const price = prices.find((p) => p.jurisdiction === comparison.jurisdiction)
            const maxCost = Math.max(...filteredComparisons.map((c) => c.yourCost))
            const percentage = maxCost > 0 ? (comparison.yourCost / maxCost) * 100 : 0

            return (
              <div key={comparison.jurisdiction} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          comparison.schemeType === 'ETS'
                            ? 'var(--cat-digital)'
                            : comparison.schemeType === 'Carbon Tax + ETS'
                            ? 'var(--cat-home)'
                            : 'var(--cat-food)',
                      }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-foreground text-sm">{comparison.jurisdiction}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-panel border border-surface-border text-foreground-muted">
                      {comparison.schemeType}
                    </span>
                  </div>
                  <span className="font-mono text-foreground font-semibold">
                    {formatCurrency(comparison.yourCost)}
                  </span>
                </div>
                <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor:
                        comparison.schemeType === 'ETS'
                          ? 'var(--cat-digital)'
                          : comparison.schemeType === 'Carbon Tax + ETS'
                          ? 'var(--cat-home)'
                          : 'var(--cat-food)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-foreground-muted">
                  <span>{formatCurrency(comparison.priceUsdPerTonne)}/tCO₂e</span>
                  <span>2024</span>
                </div>
              </div>
            )
          })}
      </div>

      {/* Annual cost trajectory */}
      <div className="mt-6 pt-4 border-t border-surface-border">
        <h4 className="font-medium text-foreground mb-3">Canada Federal Carbon Price Trajectory</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { year: 2024, price: 65 },
            { year: 2025, price: 80 },
            { year: 2026, price: 95 },
            { year: 2027, price: 110 },
            { year: 2028, price: 125 },
            { year: 2029, price: 140 },
            { year: 2030, price: 170 },
          ].map((point) => (
            <div
              key={point.year}
              className="flex flex-col items-center gap-1 shrink-0 w-20"
            >
              <div
                className="w-full h-20 bg-surface-border rounded-t transition-all duration-300"
                style={{
                  height: `${(point.price / 170) * 100}%`,
                  backgroundColor: 'var(--accent-primary)',
                }}
                title={`${point.year}: ${formatCurrency(point.price * tonnesCo2e)}`} />
              <span className="text-xs text-foreground-muted font-mono">{point.year}</span>
              <span className="text-xs text-foreground-subtle font-mono">
                {formatCurrency(point.price * tonnesCo2e)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-foreground-muted">Annual cost at each price level</span>
          <span className="text-sm text-foreground-muted">$65/t → $170/t by 2030</span>
        </div>
      </div>
    </div>
  )
}