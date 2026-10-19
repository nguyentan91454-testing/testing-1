import React from 'react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionTo?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionTo,
  onActionClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 max-w-md mx-auto my-8 space-y-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl shadow-inner">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">{description}</p>
      </div>

      {(actionText && (actionTo || onActionClick)) && (
        <div className="pt-2">
          {actionTo ? (
            <Link to={actionTo}>
              <Button size="sm" variant="primary">
                {actionText}
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="primary" onClick={onActionClick}>
              {actionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
