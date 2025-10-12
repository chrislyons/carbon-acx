import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { ReactNode } from 'react';

interface QuickActionProps {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
}

export default function QuickAction({ title, description, to, icon }: QuickActionProps) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:shadow-md hover:border-accent-300 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-accent-600">{icon}</div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-accent-600 transition-colors">
                {title}
              </h3>
            </div>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}
