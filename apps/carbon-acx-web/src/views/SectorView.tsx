import { Suspense } from 'react';
import { Await, Link, useLoaderData, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Layers } from 'lucide-react';

import type { ActivitySummary, DatasetSummary, SectorSummary } from '../lib/api';
import { useProfile } from '../contexts/ProfileContext';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import ActivityMatrix, { ActivityMatrixSkeleton } from '../components/ActivityMatrix';
import ComparativeBarChart from '../components/charts/ComparativeBarChart';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import FullscreenChart from '../components/FullscreenChart';
import { getSectorActivityBreakdown, getSectorEmissionsTrend } from '../lib/demoData';
import type { LayoutOutletContext } from './Layout';

interface SectorLoaderData {
  sector: Promise<SectorSummary>;
  activities: Promise<ActivitySummary[]>;
}

export default function SectorView() {
  const data = useLoaderData() as SectorLoaderData;
  const { datasets } = useOutletContext<LayoutOutletContext>();
  const { profile } = useProfile();

  return (
    <Suspense fallback={<SectorSkeleton />}>
      <Await resolve={Promise.all([data.sector, data.activities])}>
        {([sector, activities]) => (
          <div className="space-y-8">
            {/* Sector Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl bg-gradient-to-br from-accent-500/10 via-surface to-accent-600/5 p-8 md:p-12 overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-accent-400/30 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent-600/20 blur-3xl" />
              </div>

              {/* Content */}
              <div className="relative z-10 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-2xl bg-accent-50 text-accent-600">
                    <Layers className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-4xl font-bold text-foreground mb-2">{sector.name}</h2>
                    <p className="text-lg text-text-secondary max-w-3xl">
                      {sector.description ?? 'Explore carbon impact data for this sector.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <StatCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    label="Activities tracked"
                    value={activities.length}
                  />
                  <StatCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    label="Datasets available"
                    value={datasets.length}
                  />
                  <StatCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    label="In your profile"
                    value={profile.activities.filter(a => a.sectorId === sector.id).length}
                    highlight={profile.activities.filter(a => a.sectorId === sector.id).length > 0}
                  />
                </div>
              </div>
            </motion.div>

            {/* Sector Visualizations - IMMEDIATELY VISIBLE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Activity Impact Comparison */}
              <Card className="p-4 relative">
                <FullscreenChart
                  title={`${sector.name} Activity Comparison`}
                  description="Compare carbon intensity across sector activities"
                >
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-foreground">Activity Impact</h3>
                    <p className="text-xs text-text-muted">Annual emissions by activity type (kg CO₂)</p>
                  </div>
                  <ComparativeBarChart
                    data={getSectorActivityBreakdown(sector.id)}
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

              {/* Sector Emissions Trend */}
              <Card className="p-4 relative">
                <FullscreenChart
                  title={`${sector.name} Emissions Trend`}
                  description="12-month sector emissions trajectory"
                >
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-foreground">Sector Trend</h3>
                    <p className="text-xs text-text-muted">Demo data: 12-month sector tracking</p>
                  </div>
                  <TimeSeriesChart
                    data={getSectorEmissionsTrend(sector.id)}
                    valueKey="value"
                    variant="area"
                    showTrend={true}
                    height={280}
                    animated={true}
                  />
                </FullscreenChart>
              </Card>
            </motion.div>

            {/* Activity Matrix */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-accent-500" />
                    Activity Carbon Impact
                  </CardTitle>
                  <p className="text-sm text-text-muted mt-2">
                    Select activities to add to your personal carbon profile. Click on any activity to see its impact.
                  </p>
                </CardHeader>
                <CardContent>
                  <ActivityMatrix
                    activities={activities}
                    sectorId={sector.id}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Dataset CTA */}
            <SectorDatasetCta datasets={datasets} sector={sector} />
          </div>
        )}
      </Await>
    </Suspense>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        highlight
          ? 'bg-accent-50 border-accent-200'
          : 'bg-surface/80 border-border/50'
      }`}
    >
      <div className="flex items-center gap-2 text-text-muted mb-2">
        {icon}
        <span className="text-sm font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${highlight ? 'text-accent-600' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function SectorDatasetCta({
  datasets,
  sector,
}: {
  datasets: DatasetSummary[];
  sector: SectorSummary;
}) {
  const primaryDataset = datasets[0];
  if (!primaryDataset) {
    return null;
  }
  const href = `/sectors/${encodeURIComponent(sector.id)}/datasets/${encodeURIComponent(primaryDataset.datasetId)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="border-accent-200 bg-gradient-to-br from-accent-50 to-surface">
        <CardHeader>
          <CardTitle>Ready to explore visualizations?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">
            View detailed carbon data visualizations, trends, and citations for {sector.name}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={href}>
                <BarChart3 className="h-5 w-5" />
                View latest dataset
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {datasets.length > 1 && (
              <Button asChild variant="outline" size="lg">
                <Link to={`/sectors/${encodeURIComponent(sector.id)}`}>
                  View all {datasets.length} datasets
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectorSkeleton() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-surface/50 p-8 md:p-12">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-[280px]" />
        </Card>
        <Card className="p-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-[280px]" />
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <ActivityMatrixSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
