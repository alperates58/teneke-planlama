'use client';

import React from 'react';

export interface EnterpriseBadgeProps {
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'purple';
  size?: 'xs' | 'sm';
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const EnterpriseBadge: React.FC<EnterpriseBadgeProps> = ({
  variant = 'default',
  size = 'xs',
  children,
  className = '',
  title,
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    neutral: 'bg-slate-800/80 text-slate-400 border-slate-700/80',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    critical: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    info: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
    purple: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 font-mono font-medium',
    sm: 'text-xs px-2.5 py-1 font-mono font-medium',
  };

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border tracking-wider uppercase select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
