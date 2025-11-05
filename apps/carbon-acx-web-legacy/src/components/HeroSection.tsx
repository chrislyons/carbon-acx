import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from './ui/button';
import QuickCalculator from './QuickCalculator';
import type { DatasetSummary, SectorSummary } from '../lib/api';

interface HeroSectionProps {
  sectors?: SectorSummary[];
  latestDataset?: DatasetSummary;
}

export default function HeroSection({ sectors, latestDataset }: HeroSectionProps) {
  const topSectors = sectors?.slice(0, 3) || [];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-accent-500/10 via-surface to-accent-600/5 p-8 md:p-12 lg:p-16"
    >
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent-600/10 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full">
        {/* Dataset badge */}
        {latestDataset && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-surface/80 backdrop-blur border border-border/50 text-sm text-text-secondary"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
            </span>
            <span>
              Latest data: <strong className="text-foreground">{latestDataset.datasetId}</strong>
            </span>
            {latestDataset.generatedAt && (
              <span className="text-text-muted">
                · {new Date(latestDataset.generatedAt).toLocaleDateString()}
              </span>
            )}
          </motion.div>
        )}

        {/* Hero headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-6 mb-12"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
            Step inside the world of{' '}
            <span className="bg-gradient-to-r from-accent-500 to-accent-700 bg-clip-text text-transparent">
              carbon data
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary max-w-3xl leading-relaxed">
            Explore incomprehensible amounts of carbon data transformed into beautiful, tangible insights.
            See trends projected onto industries and your own lifestyle.
          </p>
        </motion.div>

        {/* Quick stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12"
        >
          <StatCard
            label="Sectors tracked"
            value={sectors?.length || 0}
            trend="neutral"
            delay={0.6}
          />
          <StatCard
            label="Data visualizations"
            value={latestDataset?.figureCount || 0}
            trend="up"
            delay={0.7}
          />
          <StatCard
            label="Active profiles"
            value="12.4k"
            trend="up"
            delay={0.8}
            badge="Growing"
          />
        </motion.div>

        {/* Top sectors preview */}
        {topSectors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-12"
          >
            <h3 className="text-sm font-medium uppercase tracking-wide text-text-muted mb-4">
              Explore by industry
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topSectors.map((sector, index) => (
                <Link
                  key={sector.id}
                  to={`/sectors/${sector.id}`}
                  className="group"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="p-6 rounded-2xl bg-surface/80 backdrop-blur border border-border hover:border-accent-500/50 transition-all shadow-lg hover:shadow-xl"
                  >
                    <h4 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent-500 transition-colors">
                      {sector.name}
                    </h4>
                    {sector.description && (
                      <p className="text-sm text-text-muted line-clamp-2">
                        {sector.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center text-sm text-accent-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore sector <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex flex-wrap gap-4"
        >
          <Button
            asChild
            size="lg"
            className="px-8 py-6 text-lg rounded-full bg-accent-500 hover:bg-accent-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Link to={sectors && sectors.length > 0 ? `/sectors/${sectors[0].id}` : '/sectors'}>
              Start exploring
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <QuickCalculator />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <span className="text-xs uppercase tracking-wide">Scroll to explore</span>
            <div className="h-8 w-5 rounded-full border-2 border-text-muted/30 flex items-start justify-center p-1">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="h-1.5 w-1.5 rounded-full bg-text-muted/50"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  badge?: string;
  delay?: number;
}

function StatCard({ label, value, trend = 'neutral', badge, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="p-6 rounded-2xl bg-surface/90 backdrop-blur border border-border/50 shadow-lg"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-text-muted uppercase tracking-wide">{label}</p>
        {trend !== 'neutral' && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-accent-success' : 'text-accent-danger'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
          </div>
        )}
        {badge && (
          <span className="px-2 py-1 rounded-full bg-accent-500/10 text-accent-500 text-xs font-medium">
            {badge}
          </span>
        )}
      </div>
      <p className="text-4xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
}
