import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Zap, Globe, ArrowRight, Play, HelpCircle } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import ComparativeBarChart from '../components/charts/ComparativeBarChart';
import FullscreenChart from '../components/FullscreenChart';
import MetricCard from '../components/MetricCard';
import OnboardingWizard from '../components/OnboardingWizard';
import { useProfile } from '../contexts/ProfileContext';
import { loadDemoProfile, getDemoTimeSeries } from '../lib/demoData';
import { useLayerChartData } from '../hooks/useLayerChartData';

export default function HomeView() {
  const { totalEmissions, profile } = useProfile();
  const { chartData } = useLayerChartData();
  const hasData = profile.activities.length > 0 || profile.calculatorResults.length > 0;

  // Onboarding wizard state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if this is the user's first visit
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('acx:onboarding-completed');
    const hasSkippedOnboarding = localStorage.getItem('acx:onboarding-skipped');

    // Show onboarding if:
    // 1. User hasn't completed or skipped it
    // 2. User has no data yet (empty profile)
    if (!hasCompletedOnboarding && !hasSkippedOnboarding && !hasData) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasData]);

  return (
    <div className="space-y-3 -mt-4">
      {/* Compact Hero Bar */}
      <div className="bg-gradient-to-r from-accent-500/10 to-accent-600/5 border border-accent-200/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Carbon ACX</h1>
            <p className="text-xs text-text-muted">Real-time carbon footprint analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowOnboarding(true)}
              variant="ghost"
              size="sm"
              className="gap-1.5 h-10 text-xs"
              title="Show getting started guide"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </Button>
            {!hasData && (
              <Button
                onClick={loadDemoProfile}
                variant="outline"
                size="sm"
                className="gap-1.5 h-10 text-xs"
              >
                <Play className="h-3 w-3" />
                Load Demo Data
              </Button>
            )}
            <Link to="/dashboard">
              <Button size="sm" className="gap-1.5 h-10 text-xs">
                {hasData ? 'Your Dashboard' : 'Get Started'}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <MetricCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Emissions Total"
            value={hasData ? `${(totalEmissions / 1000).toFixed(1)}t` : '—'}
            sublabel={hasData ? 'CO₂/year' : 'No data yet'}
            color={hasData && totalEmissions < 4500 ? 'text-green-600' : 'text-orange-600'}
          />
          <MetricCard
            icon={<Globe className="h-3.5 w-3.5" />}
            label="Global Avg"
            value="4.5t"
            sublabel="CO₂/year"
          />
          <MetricCard
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Paris Target"
            value="2.0t"
            sublabel="CO₂/year by 2050"
          />
        </div>
      </div>

      {/* Live Visualizations Stack - ALWAYS VISIBLE */}
      <div className="grid grid-cols-1 gap-3">
        {/* Global Comparison Chart */}
        <Card className="p-3 relative">
          <FullscreenChart title="Global Emissions Comparison" description="Compare emissions across regions and against global averages">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-foreground">Profile Comparison</h3>
              <p className="text-xs text-text-muted">Toggle layers in the sidebar to compare emissions • Annual per capita (kg CO₂/year)</p>
            </div>
            <ComparativeBarChart
              data={chartData}
              orientation="horizontal"
              showDelta={true}
              sortBy="value"
              sortDirection="desc"
              axisLabel="kg CO₂/year"
              height={220}
              animated={true}
            />
          </FullscreenChart>
        </Card>

        {/* Emissions Trend Chart */}
        <Card className="p-3 relative">
          <FullscreenChart title="Demo Carbon Footprint Trend" description="6-month tracking simulation">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-foreground">Emissions Trend</h3>
              <p className="text-xs text-text-muted">Demo data: 6-month tracking simulation</p>
            </div>
            <TimeSeriesChart
              data={getDemoTimeSeries()}
              valueKey="value"
              variant="area"
              showTrend={true}
              referenceLines={[
                {
                  value: 4500,
                  label: 'Global Average',
                  color: '#f59e0b',
                },
              ]}
              height={220}
              animated={true}
            />
          </FullscreenChart>
        </Card>
      </div>

      {/* Data Density Note */}
      <div className="text-center py-1">
        <p className="text-xs text-text-muted">
          Hover over charts for details • Click fullscreen icons to expand • Load demo data to explore features
        </p>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard open={showOnboarding} onOpenChange={setShowOnboarding} />
    </div>
  );
}

