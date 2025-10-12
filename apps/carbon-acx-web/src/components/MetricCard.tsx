import { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel: string;
  color?: string;
}

export default function MetricCard({ icon, label, value, sublabel, color = 'text-foreground' }: MetricCardProps) {
  return (
    <div className="bg-white/50 border border-gray-200/60 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-text-muted">{icon}</div>
        <span className="text-xs font-medium text-text-muted">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-muted">{sublabel}</div>
    </div>
  );
}
