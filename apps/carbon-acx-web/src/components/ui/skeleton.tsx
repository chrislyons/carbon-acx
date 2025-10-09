import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'h-4 w-full animate-pulse rounded-md bg-neutral-200/70 dark:bg-neutral-700/60',
        className,
      )}
      {...props}
    />
  );
}
