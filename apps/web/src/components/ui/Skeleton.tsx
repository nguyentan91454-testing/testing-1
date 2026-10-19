import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800',
        className
      )}
      {...props}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => (
  <div className="rounded-2xl p-4 glass-panel space-y-3">
    <Skeleton className="w-full aspect-square rounded-xl" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-9 w-9 rounded-xl" />
    </div>
  </div>
);
