import clsx from 'clsx';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
  variant = 'default',
  subtitle,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg bg-white border border-stone-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">{label}</p>
          <p
            className={clsx('text-xl font-semibold', {
              'text-stone-900': variant === 'default',
              'text-green-700': variant === 'success',
              'text-amber-700': variant === 'warning',
              'text-red-600': variant === 'danger',
            })}
          >
            {value}
          </p>
          {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-stone-300">{icon}</div>}
      </div>
    </div>
  );
}
