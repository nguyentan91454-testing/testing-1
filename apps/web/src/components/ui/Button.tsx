import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-sans font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97]';

    const variants = {
      // Deep Burgundy — main CTA
      primary:
        'btn-victorian-primary focus:ring-brand-700',
      // Royal Gold — accent CTA
      gold:
        'btn-victorian-gold focus:ring-gold-600',
      // Warm cream secondary
      secondary:
        'bg-cream-100 hover:bg-cream-200 text-espresso-800 dark:bg-espresso-800 dark:hover:bg-espresso-700 dark:text-cream-100 focus:ring-gold-600 border border-gold-500/30 dark:border-gold-700/30',
      // Gold outline
      outline:
        'bg-transparent hover:bg-cream-100 text-espresso-800 dark:text-cream-200 dark:hover:bg-espresso-800 border border-gold-600/50 dark:border-gold-700/40 focus:ring-gold-600',
      // Ghost
      ghost:
        'bg-transparent hover:bg-cream-100 dark:hover:bg-espresso-800 text-espresso-700 dark:text-cream-300 focus:ring-gold-500',
      // Danger (deep red)
      danger:
        'bg-red-800 hover:bg-red-900 text-cream-50 shadow-md shadow-red-900/20 focus:ring-red-700 border border-red-700/50',
      // Glow — hero CTA with burgundy gradient + gold border
      glow:
        'bg-brand-700 hover:bg-brand-600 text-cream-50 shadow-burgundy hover:shadow-burgundy-lg focus:ring-brand-700 border border-gold-600/40 hover:border-gold-500/60',
    };

    const sizes = {
      sm:   'text-xs px-4 py-1.5 gap-1.5 tracking-wide',
      md:   'text-sm px-5 py-2.5 gap-2 tracking-wide',
      lg:   'text-base px-8 py-3 gap-2.5 tracking-wide',
      icon: 'p-2.5 w-10 h-10',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="inline-flex">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
