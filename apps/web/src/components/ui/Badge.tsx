import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gradient' | 'secondary' | 'ai' | 'gold';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  const base = 'inline-flex items-center font-sans font-semibold rounded-full select-none tracking-wide';

  const variants = {
    // Royal Gold — primary brand accent
    primary:   'bg-gold-500/15 dark:bg-gold-900/40 text-gold-700 dark:text-gold-400 border border-gold-500/40 dark:border-gold-700/50',
    // Deep Burgundy for danger / sale tags
    danger:    'bg-brand-700 text-cream-50 border border-brand-800/60 shadow-sm',
    // Warm Amber warning
    warning:   'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/40',
    // Forest success
    success:   'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/40',
    // Soft blue info
    info:      'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-700/40',
    // Espresso neutral
    neutral:   'bg-espresso-100 dark:bg-espresso-800/60 text-espresso-700 dark:text-espresso-300 border border-espresso-200/60 dark:border-espresso-700/40',
    // Muted secondary
    secondary: 'bg-cream-200 dark:bg-espresso-800/40 text-espresso-600 dark:text-cream-400 border border-cream-400/60 dark:border-espresso-700/40',
    // Royal Gold shimmer — for highlight
    gold:      'shimmer-gold text-espresso-900 border border-gold-600/50 shadow-gold',
    // Victorian gradient — heading decor
    gradient:  'bg-burgundy-gradient text-cream-50 border border-gold-700/40 shadow-sm',
    // AI Pick badge — deep burgundy + gold text
    ai:        'ai-badge',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-0.5',
    md: 'text-[11px] px-2.5 py-1 gap-1',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};
