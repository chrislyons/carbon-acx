import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Globe, ArrowRight, Play } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import ComparativeBarChart from '../components/charts/ComparativeBarChart';
import FullscreenChart from '../components/FullscreenChart';
import MetricCard from '../components/MetricCard';
import QuickAction from '../components/QuickAction';
import { useProfile } from '../contexts/ProfileContext';
import { loadDemoProfile, getDemoTimeSeries, getGlobalComparisonData } from '../lib/demoData';

export default function HomeView() {
  const { totalEmissions, profile } = useProfile();
  const hasData = profile.activities.length > 0 || profile.calculatorResults.length > 0;

  return (
    <div className="space-y-4 -mt-4">
      {/* Compact Hero Bar */}
      <div className="bg-gradient-to-r from-accent-500/10 to-accent-600/5 border border-accent-200/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carbon ACX</h1>
            <p className="text-xs text-text-muted mt-0.5">Real-time carbon footprint analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {!hasData && (
              <Button
                onClick={loadDemoProfile}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                <Play className="h-3 w-3" />
                Load Demo Data
              </Button>
            )}
            <Link to="/dashboard">
              <Button size="sm" className="gap-1.5 h-8 text-xs">
                {hasData ? 'Your Dashboard' : 'Get Started'}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <MetricCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Your Footprint"
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

      {/* Live Visualizations Grid - ALWAYS VISIBLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Global Comparison Chart */}
        <Card className="p-4 relative">
          <FullscreenChart title="Global Carbon Footprint Comparison" description="Annual per capita emissions">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-foreground">Global Comparison</h3>
              <p className="text-xs text-text-muted">Annual per capita emissions (kg CO₂)</p>
            </div>
            <ComparativeBarChart
              data={getGlobalComparisonData()}
              orientation="horizontal"
              showDelta={true}
              sortBy="value"
              sortDirection="desc"
              axisLabel="kg CO₂/year"
              height={280}
              animated={true}
            />
          </FullscreenChart>
        </Card>

        {/* Emissions Trend Chart */}
        <Card className="p-4 relative">
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
              height={280}
              animated={true}
            />
          </FullscreenChart>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickAction
          title="Track Activities"
          description="Select from 100+ carbon activities"
          to="/"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <QuickAction
          title="Quick Calculator"
          description="Get instant footprint estimate"
          to="/?calculator=true"
          icon={<Zap className="h-4 w-4" />}
        />
        <QuickAction
          title="View Dashboard"
          description="Analyze your carbon profile"
          to="/dashboard"
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      {/* Data Density Note */}
      <div className="text-center py-2">
        <p className="text-xs text-text-muted">
          Hover over charts for details • Click fullscreen icons to expand • Load demo data to explore features
        </p>
      </div>
    </div>
  );
}

