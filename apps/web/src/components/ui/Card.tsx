import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  glass = true,
  hoverEffect = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        glass
          ? 'glass-panel shadow-sm'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm',
        hoverEffect && 'hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
