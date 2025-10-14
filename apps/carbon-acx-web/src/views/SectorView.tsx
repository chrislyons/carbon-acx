import { Suspense } from 'react';
import { Await, Link, useLoaderData, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Layers } from 'lucide-react';

import type { ActivitySummary, DatasetSummary, ProfileSummary, SectorSummary } from '../lib/api';
import { useProfile } from '../contexts/ProfileContext';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import ActivityBadgeGrid from '../components/ActivityBadgeGrid';
import ComparativeBarChart from '../components/charts/ComparativeBarChart';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import FullscreenChart from '../components/FullscreenChart';
import { getSectorActivityBreakdown, getSectorEmissionsTrend } from '../lib/demoData';
import type { LayoutOutletContext } from './Layout';
import ProfilePicker from './ProfilePicker';

interface SectorLoaderData {
  sector: Promise<SectorSummary>;
  activities: Promise<ActivitySummary[]>;
  profiles: Promise<ProfileSummary[]>;
}

export default function SectorView() {
  const data = useLoaderData() as SectorLoaderData;
  const { datasets } = useOutletContext<LayoutOutletContext>();
  const { profile } = useProfile();

  return (
    <Suspense fallback={<SectorSkeleton />}>
      <Await resolve={Promise.all([data.sector, data.activities, data.profiles])}>
        {([sector, activities, profiles]) => (
          <div className="space-y-3">
            {/* Sector Header - Ultra Compact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 bg-gradient-to-r from-accent-500/10 to-accent-600/5 border border-accent-200/30 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-50 text-accent-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{sector.name}</h2>
                  <p className="text-xs text-text-muted">{sector.description ?? 'Explore carbon impact data'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span><strong>{profiles.length}</strong> profiles</span>
                <span>•</span>
                <span><strong>{activities.length}</strong> activities</span>
                <span>•</span>
                <span><strong>{profile.activities.filter(a => a.sectorId === sector.id).length}</strong> in profile</span>
              </div>
            </motion.div>

            {/* Two-Column Layout: Profile Presets (left) + Activities (right) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-3"
            >
              {/* Left Column: Profile Presets */}
              {profiles.length > 0 && (
                <div className="lg:col-span-4">
                  <ProfilePicker profiles={profiles} sectorId={sector.id} activities={activities} />
                </div>
              )}

              {/* Right Column: Activities Browser */}
              <div className={profiles.length > 0 ? "lg:col-span-8" : "lg:col-span-12"}>
                <Card className="flex flex-col h-[500px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-accent-500" />
                      {sector.name} Activities
                    </CardTitle>
                    <p className="text-xs text-text-muted">
                      Select activities to add to your profile.
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
                    <ActivityBadgeGrid
                      activities={activities}
                      sectorId={sector.id}
                    />
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Sector Visualizations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-3"
            >
              {/* Activity Impact Comparison */}
              <Card className="p-3 relative">
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
                    height={220}
                    animated={true}
                  />
                </FullscreenChart>
              </Card>

              {/* Sector Emissions Trend */}
              <Card className="p-3 relative">
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
                    height={220}
                    animated={true}
                  />
                </FullscreenChart>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
